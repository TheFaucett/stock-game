// src/components/Bank.jsx
import React, { useState } from 'react'
import { useQuery }        from '@tanstack/react-query'
import axios               from 'axios'
import '../styles/bank.css'

const USER_ID = '67af822e5609849ac14d7942'

async function fetchBank({ queryKey }) {
  const [, userId] = queryKey
  const { data }  = await axios.get(`http://localhost:5000/api/bank/${userId}`)
  return data
}

export default function Bank() {
  // separate state hooks!
  const [depositAmt, setDepositAmt] = useState('')
  const [loanAmt,    setLoanAmt]    = useState('')
  const [loanTerm,   setLoanTerm]   = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey:   ['bank', USER_ID],
    queryFn:    fetchBank,
    staleTime:  30_000
  })

  if (isLoading) return <p>Loading…</p>
  if (error)     return <p>Failed to load bank info</p>

  const { loans, deposits } = data

  const handleDeposit = async () => {
    const amt = parseFloat(depositAmt)
    if (isNaN(amt) || amt <= 0) {
      return alert('Enter a valid deposit amount')
    }
    try {
      await axios.post(
        `http://localhost:5000/api/bank/${USER_ID}/deposit`,
        { amount: amt }
      )
      setDepositAmt('')     // clear only the deposit field
      refetch()
    } catch (e) {
      console.error(e)
      alert('Deposit failed')
    }
  }

  const handleLoan = async () => {
    const amt  = parseFloat(loanAmt)
    const term = parseInt(loanTerm, 10)
    if (isNaN(amt) || amt <= 0 || isNaN(term) || term <= 0) {
      return alert('Enter valid loan amount and term')
    }
    try {
      await axios.post(
        `http://localhost:5000/api/bank/${USER_ID}/loan`,
        { amount: amt, term }
      )
      setLoanAmt('')
      setLoanTerm('')
      refetch()
    } catch (e) {
      console.error(e)
      alert('Loan request failed')
    }
  }

  return (
    <div className="bank-container">
      <div className="bank-card">
        <h2>Make a Deposit</h2>
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
        <h3>Your Deposits</h3>
        <ul>
          {deposits.map(d => (
            <li key={d._id}>
              ${d.amount.toFixed(2)} @ tick {d.startTick}
            </li>
          ))}
        </ul>
      </div>

      <div className="bank-card">
        <h2>Take a Loan</h2>
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
        <h3>Your Loans</h3>
        <ul>
          {loans.map(l => (
            <li key={l._id}>
              ${l.amount.toFixed(2)} &rarr; balance ${l.balance.toFixed(2)}, term {l.term} ticks
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
