import { Request, Response } from 'express';
import { LRUCache } from 'lru-cache';
import { DEFAULT_MIME_TYPE, parseContentType } from './contentType.js';
import { HeliaFetch } from './heliaFetch.js';

export interface routeEntry {
    path: string
    type: 'get' | 'post'
    handler: (request: Request, response: Response) => Promise<void>
}

const delegatedRoutingAPI = (ipns: string) => `https://node3.delegate.ipfs.io/api/v0/name/resolve/${ipns}?r=false`

class HeliaFetcher {
    private heliaFetch: HeliaFetch
    public routes: routeEntry[]
    public isReady: Promise<void>
    private ipnsResolutionCache: LRUCache<string, string> = new LRUCache({
        max: 10000,
        ttl: 1000 * 60 * 60 * 24
    })

    constructor () {
        this.isReady = this.init()
        this.routes = []
    }

    async init (): Promise<void> {
        this.heliaFetch = new HeliaFetch()
        await this.heliaFetch.ready
        console.log('Helia Started!')
        this.routes = [
            {
                path: '/ipfs/*',
                type: 'get',
                handler: this.fetchIpfs.bind(this)
            }, {
                path: '/ipns/*',
                type: 'get',
                handler: this.fetchIpns.bind(this)
            }, {
                path: '/api/v0/repo/gc',
                type: 'get',
                handler: this.gc.bind(this)
            }, {
                path: '/*',
                type: 'get',
                handler: this.redirectRelative.bind(this)
            }
        ]
    }

    private async redirectRelative (request: Request, response: Response): Promise<void> {
        const referrerPath = new URL(request.headers.referer ?? '').pathname
        if (referrerPath) {
            response.redirect(`${referrerPath}${request.path}`.replace(/\/\//g, '/'))
        }
    }

    private async fetchIpfs (request: Request, response: Response, overridePath = ''): Promise<void> {
        try {
            await this.isReady
            let type = undefined
            const routePath = overridePath ?? request.path
            for await (const chunk of await this.heliaFetch.fetch(routePath)) {
                if (!type) {
                    const { relativePath: path } = this.heliaFetch.parsePath(routePath)
                    type = await parseContentType({ bytes: chunk, path }) as string
                    // this needs to happen first.
                    response.setHeader('Content-Type', type ?? DEFAULT_MIME_TYPE)
                    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
                }
                response.write(Buffer.from(chunk))
            }
            response.end()
        } catch (error) {
            console.debug(error)
            response.status(500).end()
        }
    }

    async fetchIpns (request: Request, response: Response): Promise<void> {
        try {
            await this.isReady

            const {
                relativePath,
                address: domain
            } = this.heliaFetch.parsePath(request.path)

            if (request.headers.referer) {
                const refererPath = new URL(request.headers.referer).pathname
                if (!request.originalUrl.startsWith(refererPath)) {
                    const { namespace } = this.heliaFetch.parsePath(refererPath)
                    if (namespace === 'ipns') {
                        const finalUrl = `${request.headers.referer}/${domain}/${relativePath}`.replace(/([^:]\/)\/+/g, "$1")
                        return response.redirect(finalUrl)
                    }
                }
            }

            if (!this.ipnsResolutionCache.has(domain)) {
                const { Path } = await (await fetch(delegatedRoutingAPI(domain))).json()
                this.ipnsResolutionCache.set(domain, Path)
            }
            await this.fetchIpfs(request, response, `${this.ipnsResolutionCache.get(domain)}${relativePath}`)
        } catch (error) {
            console.debug(error)
            response.status(500).end()
        }
    }

    async gc (request: Request, response: Response): Promise<void> {
        await this.isReady
        await this.heliaFetch.node?.gc()
        response.status(200).end()
    }
}

const heliaFetcher = new HeliaFetcher()
export default heliaFetcher
