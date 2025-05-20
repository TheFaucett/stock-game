// src/components/Bank.jsx
import React, { useState } from 'react'
import { useQuery }        from '@tanstack/react-query'
import axios               from 'axios'
import '../styles/bank.css'

const USER_ID = '67af822e5609849ac14d7942'

async function fetchBank({ queryKey }) {
  const [, userId] = queryKey
  const { data }   = await axios.get(`http://localhost:5000/api/bank/${userId}`)
  return data
}

export default function Bank() {
  const [depositAmt, setDepositAmt]     = useState('')
  const [loanAmt,    setLoanAmt]        = useState('')
  const [loanTerm,   setLoanTerm]       = useState('')
  const [withdrawAmt, setWithdrawAmt]   = useState({})

  const { data, isLoading, error, refetch } = useQuery({
    queryKey:   ['bank', USER_ID],
    queryFn:    fetchBank,
    staleTime:  30_000
  })

  if (isLoading) return <p>Loading…</p>
  if (error)     return <p>Error loading bank info</p>

  const { loans, deposits } = data

  // Helper to compute remaining on a deposit
  function remaining(d) {
    const withdrawnSoFar = (d.withdrawals || []).reduce((sum, w) => sum + w.amount, 0)
    return d.amount - withdrawnSoFar
  }

  async function handleDeposit() {
    const amt = parseFloat(depositAmt)
    if (isNaN(amt) || amt <= 0) return alert('Enter a valid deposit amount')
    await axios.post(`http://localhost:5000/api/bank/${USER_ID}/deposit`, { amount: amt })
    setDepositAmt('')
    refetch()
  }

  async function handleLoan() {
    const amt  = parseFloat(loanAmt)
    const term = parseInt(loanTerm, 10)
    if (isNaN(amt) || amt <= 0 || isNaN(term) || term <= 0)
      return alert('Enter valid loan amount and term')
    await axios.post(`http://localhost:5000/api/bank/${USER_ID}/loan`, { amount: amt, term })
    setLoanAmt('')
    setLoanTerm('')
    refetch()
  }

  async function handleWithdraw(depositId) {
    const raw = withdrawAmt[depositId]
    const amt = parseFloat(raw)
    if (isNaN(amt) || amt <= 0) return alert('Enter a valid withdraw amount')
    try {
      await axios.post(
        `http://localhost:5000/api/bank/${USER_ID}/deposit/${depositId}/withdraw`,
        { amount: amt }
      )
      // clear just that field
      setWithdrawAmt(prev => ({ ...prev, [depositId]: '' }))
      refetch()
    } catch (e) {
      console.error(e)
      alert(e.response?.data?.error || 'Withdraw failed')
    }
  }

  // Only the deposits with anything left
  const activeDeposits = deposits.filter(d => remaining(d) > 0 && !d.closed)

  return (
    <div className="bank-container">
      {/* DEPOSIT */}
      <div className="bank-card">
        <h2>Make a Deposit</h2>
        <div className="bank-form">
          <input
            type="number"
            placeholder="Amount"
            className="bank-input"
            value={depositAmt}
            onChange={e => setDepositAmt(e.target.value)}
          />
          <button className="bank-button" onClick={handleDeposit}>
            Deposit
          </button>
        </div>
        <h3>Your Deposits</h3>
        <ul className="bank-list">
          {deposits.map(d => (
            <li key={d._id} className="bank-list-item">
              <span>
                ${d.amount.toFixed(2)} @ tick {d.startTick}
                {d.closed ? " (closed)" : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* WITHDRAW */}
      <div className="bank-card">
        <h2>Withdraw</h2>
        {activeDeposits.length === 0 ? (
          <p style={{ color: "#888" }}>No open deposits to withdraw from.</p>
        ) : (
          <ul className="bank-list">
            {activeDeposits.map(d => {
              const rem = remaining(d)
              return (
                <li key={d._id} className="bank-list-item">
                  <div>
                    Remaining ${rem.toFixed(2)} from deposit @ tick {d.startTick}
                  </div>
                  <div className="bank-form">
                    <input
                      type="number"
                      placeholder="Amount"
                      className="bank-input"
                      value={withdrawAmt[d._id] || ''}
                      onChange={e =>
                        setWithdrawAmt(prev => ({ ...prev, [d._id]: e.target.value }))
                      }
                    />
                    <button
                      className="bank-button"
                      onClick={() => handleWithdraw(d._id)}
                    >
                      Withdraw
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* LOAN */}
      <div className="bank-card">
        <h2>Take a Loan</h2>
        <div className="bank-form">
          <input
            type="number"
            placeholder="Amount"
            className="bank-input"
            value={loanAmt}
            onChange={e => setLoanAmt(e.target.value)}
          />
          <input
            type="number"
            placeholder="Term (ticks)"
            className="bank-input"
            value={loanTerm}
            onChange={e => setLoanTerm(e.target.value)}
          />
          <button className="bank-button" onClick={handleLoan}>
            Take Loan
          </button>
        </div>
        <h3>Your Loans</h3>
        <ul className="bank-list">
          {loans.map(l => (
            <li key={l._id} className="bank-list-item">
              Owed ${l.balance.toFixed(2)} of ${l.amount.toFixed(2)} over {l.term} ticks
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
