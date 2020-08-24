import { between, extend, warn } from '@better-scroll/shared-utils'
import BScroll from '@better-scroll/core'
import { SlideConfig, BASE_PAGE } from './index'
import PagesMatrix, { PageStats } from './PagesMatrix'

export interface PageIndex {
  pageX: number
  pageY: number
}
export interface Position {
  x: number
  y: number
}

export type Page = PageIndex & Position

const enum Direction {
  Positive = 'positive',
  Negative = 'negative',
}

export default class SlidePages {
  loopX: boolean
  loopY: boolean
  slideX: boolean
  slideY: boolean
  needLoop: boolean
  pagesMatrix: PagesMatrix
  currentPage: Page
  constructor(public scroll: BScroll, private slideOptions: SlideConfig) {}

  init() {
    this.currentPage = this.currentPage || extend({}, BASE_PAGE)
    this.pagesMatrix = new PagesMatrix(this.scroll)
    this.checkSlideLoop()
  }

  setCurrentPage(newPage: Page) {
    this.currentPage = newPage
  }

  getInternalPage(pageX: number, pageY: number): Page | undefined {
    if (!this.pagesMatrix.hasPages()) {
      return
    }
    if (pageX >= this.pagesMatrix.pageLengthOfX) {
      pageX = this.pagesMatrix.pageLengthOfX - 1
    } else if (pageX < 0) {
      pageX = 0
    }

    if (pageY >= this.pagesMatrix.pageLengthOfY) {
      pageY = this.pagesMatrix.pageLengthOfY - 1
    } else if (pageY < 0) {
      pageY = 0
    }

    let { x, y } = this.pagesMatrix.getPageStats(pageX, pageY)

    return {
      pageX,
      pageY,
      x,
      y,
    }
  }

  getInitialPage(): Page {
    let initPageX = this.loopX ? 1 : 0
    let initPageY = this.loopY ? 1 : 0

    const pageX = this.currentPage.pageX || initPageX
    const pageY = this.currentPage.pageY || initPageY

    const { x, y } = this.pagesMatrix.getPageStats(pageX, pageY)

    return {
      pageX,
      pageY,
      x,
      y,
    }
  }

  getExposedPage(page?: Page): Page {
    const fixedPage = (page: number, realPageLen: number) => {
      const pageIndex = []
      for (let i = 0; i < realPageLen; i++) {
        pageIndex.push(i)
      }
      pageIndex.unshift(realPageLen - 1)
      pageIndex.push(0)
      return pageIndex[page]
    }
    let exposedPage = page ? extend({}, page) : extend({}, this.currentPage)
    if (this.loopX) {
      exposedPage.pageX = fixedPage(
        exposedPage.pageX,
        this.pagesMatrix.pageLengthOfX - 2
      )
    }
    if (this.loopY) {
      exposedPage.pageY = fixedPage(
        exposedPage.pageY,
        this.pagesMatrix.pageLengthOfY - 2
      )
    }
    return exposedPage
  }

  getPageStats(): PageStats {
    return this.pagesMatrix.getPageStats(
      this.currentPage.pageX,
      this.currentPage.pageY
    )
  }

  getValidPageIndex(x: number, y: number): PageIndex | undefined {
    if (!this.pagesMatrix.hasPages()) {
      return
    }
    let lastX = this.pagesMatrix.pageLengthOfX - 1
    let lastY = this.pagesMatrix.pageLengthOfY - 1
    let firstX = 0
    let firstY = 0
    if (this.loopX) {
      x += 1
      firstX = firstX + 1
      lastX = lastX - 1
    }
    if (this.loopY) {
      y += 1
      firstY = firstY + 1
      lastY = lastY - 1
    }
    x = between(x, firstX, lastX)
    y = between(y, firstY, lastY)

    return {
      pageX: x,
      pageY: y,
    }
  }

  nextPageIndex(): PageIndex {
    return this.getPageIndexByDirection(Direction.Positive)
  }

  prevPageIndex(): PageIndex {
    return this.getPageIndexByDirection(Direction.Negative)
  }

  nearestPage(
    x: number,
    y: number,
    directionX: number,
    directionY: number
  ): Page {
    const pageIndex = this.pagesMatrix.getNearestPageIndex(x, y)
    if (!pageIndex) {
      return {
        x: 0,
        y: 0,
        pageX: 0,
        pageY: 0,
      }
    }
    let { pageX, pageY } = pageIndex
    let newX
    let newY

    if (pageX === this.currentPage.pageX) {
      pageX += directionX
      pageX = between(pageX, 0, this.pagesMatrix.pageLengthOfX - 1)
    }
    if (pageY === this.currentPage.pageY) {
      pageY += directionY
      pageY = between(pageIndex.pageY, 0, this.pagesMatrix.pageLengthOfY - 1)
    }

    newX = this.pagesMatrix.getPageStats(pageX, 0).x
    newY = this.pagesMatrix.getPageStats(0, pageY).y

    return {
      x: newX,
      y: newY,
      pageX,
      pageY,
    }
  }

  resetLoopPage(): PageIndex | undefined {
    if (this.loopX) {
      if (this.currentPage.pageX === 0) {
        return {
          pageX: this.pagesMatrix.pageLengthOfX - 2,
          pageY: this.currentPage.pageY,
        }
      }
      if (this.currentPage.pageX === this.pagesMatrix.pageLengthOfX - 1) {
        return {
          pageX: 1,
          pageY: this.currentPage.pageY,
        }
      }
    }
    if (this.loopY) {
      if (this.currentPage.pageY === 0) {
        return {
          pageX: this.currentPage.pageX,
          pageY: this.pagesMatrix.pageLengthOfY - 2,
        }
      }
      if (this.currentPage.pageY === this.pagesMatrix.pageLengthOfY - 1) {
        return {
          pageX: this.currentPage.pageX,
          pageY: 1,
        }
      }
    }
  }

  private getPageIndexByDirection(direction: Direction): PageIndex {
    let x = this.currentPage.pageX
    let y = this.currentPage.pageY
    if (this.slideX) {
      x = direction === Direction.Negative ? x - 1 : x + 1
    }
    if (this.slideY) {
      y = direction === Direction.Negative ? y - 1 : y + 1
    }
    return {
      pageX: x,
      pageY: y,
    }
  }

  private checkSlideLoop() {
    this.needLoop = this.slideOptions.loop
    if (this.pagesMatrix.pageLengthOfX > 1) {
      this.slideX = true
    }
    if (this.pagesMatrix.pages[0] && this.pagesMatrix.pageLengthOfY > 1) {
      this.slideY = true
    }
    this.loopX = this.needLoop && this.slideX
    this.loopY = this.needLoop && this.slideY

    if (this.slideX && this.slideY) {
      warn('slide does not support two direction at the same time.')
    }
  }
}
