import en from './src/locales/en.js'
import generatedLocales from './src/locales/generated.js'

const locales = { en, ...generatedLocales }

export default {
  siteUrl: process.env.SITE_URL || '',
  localizedPages: Object.fromEntries(
    Object.entries(locales).map(([slug, messages]) => [
      slug,
      {
        lang: messages.meta.locale,
        dir: messages.meta.direction,
        title: messages.seo.title,
        description: messages.seo.description,
        keywords: messages.seo.keywords,
        socialDescription: messages.seo.socialDescription,
        twitterDescription: messages.seo.twitterDescription,
        prerender: {
          title: messages.seo.title,
          dropTitle: messages.upload.dropTitle,
          dropDescription: messages.upload.dropDescription,
          selectFile: messages.upload.selectFile,
          otherMethods: messages.upload.otherMethods,
          pasteClipboard: messages.upload.pasteClipboard,
          viewShortcuts: messages.upload.viewShortcuts,
          localNotice: messages.upload.localNotice.replace('{size}', '25 MB'),
        },
      },
    ]),
  ),
}
