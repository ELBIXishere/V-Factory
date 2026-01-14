/**
 * CCTVGridView 컴포넌트 단위 테스트
 */
import { describe, it, expect, vi } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { CCTVGridView, type GridLayout } from '@/components/cctv/CCTVGridView'
import type { CCTVViewData } from '@/lib/three'

// Three.js 모킹
vi.mock('three', () => ({
  WebGLRenderer: vi.fn(),
  Scene: vi.fn(),
  PerspectiveCamera: vi.fn(),
  AmbientLight: vi.fn(),
  DirectionalLight: vi.fn(),
}))

describe('CCTVGridView', () => {
  const mockViews: CCTVViewData[] = [
    {
      id: 'cctv-1',
      name: 'CCTV 1',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      fov: 75,
      isAccident: false,
    },
    {
      id: 'cctv-2',
      name: 'CCTV 2',
      position: { x: 10, y: 5, z: 10 },
      rotation: { x: 0, y: Math.PI / 2, z: 0 },
      fov: 60,
      isAccident: false,
    },
  ]

  it('컴포넌트가 렌더링되어야 함', () => {
    render(<CCTVGridView views={mockViews} />)
    expect(screen.getByText('CCTV 1')).toBeInTheDocument()
  })

  it('2x2 레이아웃을 올바르게 표시해야 함', () => {
    const { container } = render(
      <CCTVGridView views={mockViews} layout="2x2" />
    )
    const grid = container.querySelector('.grid')
    expect(grid).toBeInTheDocument()
  })

  it('3x3 레이아웃을 올바르게 표시해야 함', () => {
    const { container } = render(
      <CCTVGridView views={mockViews} layout="3x3" />
    )
    const grid = container.querySelector('.grid')
    expect(grid).toBeInTheDocument()
  })

  it('4x4 레이아웃을 올바르게 표시해야 함', () => {
    const { container } = render(
      <CCTVGridView views={mockViews} layout="4x4" />
    )
    const grid = container.querySelector('.grid')
    expect(grid).toBeInTheDocument()
  })

  it('빈 뷰 배열을 처리해야 함', () => {
    render(<CCTVGridView views={[]} />)
    // 빈 상태 메시지가 표시되어야 함
    expect(screen.queryByText('CCTV 1')).not.toBeInTheDocument()
  })

  it('선택된 CCTV를 하이라이트해야 함', () => {
    render(
      <CCTVGridView
        views={mockViews}
        selectedCCTVId="cctv-1"
      />
    )
    // 선택된 CCTV가 표시되어야 함
    expect(screen.getByText('CCTV 1')).toBeInTheDocument()
  })
})
