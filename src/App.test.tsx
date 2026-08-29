import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('LaporAI', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('enters the portal without secret credentials', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByText(/unofficial demo/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /continue as demo taxpayer/i }))
    expect(screen.getByRole('heading', { name: /annual tax return/i })).toBeInTheDocument()
  })

  it('keeps final filing as a human-only action', async () => {
    localStorage.setItem('laporai-state', JSON.stringify({ status: 'declaration', loggedIn: true }))
    render(<App />)
    expect(screen.getByRole('button', { name: /simulate signing and filing/i })).toBeInTheDocument()
    expect(screen.getByText(/only you can complete this action/i)).toBeInTheDocument()
  })
})
