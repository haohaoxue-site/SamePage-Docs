import Image from '@tiptap/extension-image'

export const DocumentImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      assetId: {
        default: null,
        parseHTML: element => element.getAttribute('data-asset-id'),
        renderHTML: (attributes) => {
          if (typeof attributes.assetId !== 'string' || !attributes.assetId.length) {
            return {}
          }

          return {
            'data-asset-id': attributes.assetId,
          }
        },
      },
      alt: {
        default: null,
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
      caption: {
        default: null,
        parseHTML: element => element.getAttribute('data-caption'),
        renderHTML: (attributes) => {
          if (typeof attributes.caption !== 'string' || !attributes.caption.length) {
            return {}
          }

          return {
            'data-caption': attributes.caption,
          }
        },
      },
      src: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'img[data-asset-id]',
      },
    ]
  },
})
