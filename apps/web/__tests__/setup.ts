function createRect() {
  return ({
    x: 0,
    y: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: 0,
    height: 0,
    toJSON() {
      return this
    },
  }) as DOMRect
}

const createRectList = () => [createRect()] as unknown as DOMRectList

if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.getClientRects) {
  Object.defineProperty(HTMLElement.prototype, 'getClientRects', {
    configurable: true,
    value: createRectList,
  })
}

if (typeof Range !== 'undefined') {
  if (!Range.prototype.getBoundingClientRect) {
    Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: createRect,
    })
  }

  if (!Range.prototype.getClientRects) {
    Object.defineProperty(Range.prototype, 'getClientRects', {
      configurable: true,
      value: createRectList,
    })
  }
}

export {}
