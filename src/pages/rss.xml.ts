import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import { SITE } from '@/site'
import type { APIContext } from 'astro'

export async function GET(context: APIContext) {
  const posts = (await getCollection('posts'))
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.dated.getTime() - a.data.dated.getTime())

  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site!.toString(),
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.blurb,
      pubDate: post.data.dated,
      link: `/blog/${post.id}`,
    })),
  })
}
