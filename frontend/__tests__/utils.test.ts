/**
 * 유틸리티 함수 단위 테스트
 */
import { describe, it, expect } from '@jest/globals'
import {
  cn,
  getApiUrl,
  formatDateTime,
  getSeverityLabel,
  getIncidentTypeLabel,
} from '@/lib/utils'

describe('utils', () => {
  describe('cn', () => {
    it('클래스명을 올바르게 병합해야 함', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
      expect(cn('foo', null, undefined, 'bar')).toBe('foo bar')
    })

    it('TailwindCSS 클래스 충돌을 해결해야 함', () => {
      expect(cn('p-2', 'p-4')).toBe('p-4')
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    })
  })

  describe('getApiUrl', () => {
    it('factory 서비스 URL을 반환해야 함', () => {
      const url = getApiUrl('factory')
      expect(url).toBeTruthy()
      expect(typeof url).toBe('string')
    })

    it('incident 서비스 URL을 반환해야 함', () => {
      const url = getApiUrl('incident')
      expect(url).toBeTruthy()
      expect(typeof url).toBe('string')
    })

    it('asset 서비스 URL을 반환해야 함', () => {
      const url = getApiUrl('asset')
      expect(url).toBeTruthy()
      expect(typeof url).toBe('string')
    })
  })

  describe('formatDateTime', () => {
    it('Date 객체를 한국어 형식으로 포맷팅해야 함', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const formatted = formatDateTime(date)
      expect(formatted).toContain('2024')
      expect(formatted).toContain('01')
      expect(formatted).toContain('15')
    })

    it('문자열 날짜를 포맷팅해야 함', () => {
      const dateStr = '2024-01-15T10:30:00Z'
      const formatted = formatDateTime(dateStr)
      expect(formatted).toBeTruthy()
      expect(typeof formatted).toBe('string')
    })
  })

  describe('getSeverityLabel', () => {
    it('심각도 레벨에 맞는 한글 레이블을 반환해야 함', () => {
      expect(getSeverityLabel(1)).toBe('경미')
      expect(getSeverityLabel(2)).toBe('보통')
      expect(getSeverityLabel(3)).toBe('주의')
      expect(getSeverityLabel(4)).toBe('심각')
      expect(getSeverityLabel(5)).toBe('위험')
    })

    it('알 수 없는 심각도는 기본값을 반환해야 함', () => {
      expect(getSeverityLabel(0)).toBe('알 수 없음')
      expect(getSeverityLabel(6)).toBe('알 수 없음')
      expect(getSeverityLabel(-1)).toBe('알 수 없음')
    })
  })

  describe('getIncidentTypeLabel', () => {
    it('사고 유형에 맞는 한글 레이블을 반환해야 함', () => {
      expect(getIncidentTypeLabel('ENTANGLEMENT')).toBe('끼임')
      expect(getIncidentTypeLabel('FALL')).toBe('전도/넘어짐')
      expect(getIncidentTypeLabel('COLLISION')).toBe('충돌')
      expect(getIncidentTypeLabel('FIRE')).toBe('화재')
      expect(getIncidentTypeLabel('ELECTRIC_SHOCK')).toBe('감전')
      expect(getIncidentTypeLabel('OTHER')).toBe('기타')
    })

    it('알 수 없는 유형은 원본을 반환해야 함', () => {
      expect(getIncidentTypeLabel('UNKNOWN')).toBe('UNKNOWN')
    })
  })
})
