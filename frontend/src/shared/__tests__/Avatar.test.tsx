import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Avatar } from '../Avatar'

describe('Avatar', () => {
  it('shows two initials for full name', () => {
    render(<Avatar name="Imane Idrissi" color="#6366f1" />)
    expect(screen.getByText('II')).toBeInTheDocument()
  })

  it('shows one initial for single name', () => {
    render(<Avatar name="Imane" color="#6366f1" />)
    expect(screen.getByText('I')).toBeInTheDocument()
  })

  it('uses first and last name initials for multi-word name', () => {
    render(<Avatar name="John Michael Smith" color="#6366f1" />)
    expect(screen.getByText('JS')).toBeInTheDocument()
  })

  it('applies background color', () => {
    render(<Avatar name="Imane" color="#6366f1" />)
    const el = screen.getByTitle('Imane')
    expect(el).toHaveStyle({ backgroundColor: '#6366f1' })
  })

  it('renders sm size with correct class', () => {
    render(<Avatar name="Imane" color="#6366f1" size="sm" />)
    const el = screen.getByTitle('Imane')
    expect(el.className).toContain('h-8')
    expect(el.className).toContain('w-8')
  })

  it('renders lg size with correct class', () => {
    render(<Avatar name="Imane" color="#6366f1" size="lg" />)
    const el = screen.getByTitle('Imane')
    expect(el.className).toContain('h-12')
    expect(el.className).toContain('w-12')
  })
})
