import { useEffect, useState } from 'react'

import { Game } from './game/Game'

function NamePrompt({ onConfirm }: { onConfirm: (name: string) => void }) {
    const [name, setName] = useState('')

    useEffect(() => {
        // Auto-focus will be handled by browser when input mounts
    }, [])

    const confirm = () => {
        const trimmed = name.trim()
        if (trimmed.length > 0) {
            onConfirm(trimmed)
        } else {
            // If empty, still allow with default handled on server
            onConfirm('')
        }
    }

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.5)',
                zIndex: 9999,
            }}
        >
            <div
                style={{
                    background: '#fff',
                    padding: 20,
                    borderRadius: 8,
                    minWidth: 320,
                    boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                }}
            >
                <h3 style={{ marginTop: 0 }}>表示名：</h3>
                <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder='例：Player123'
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') confirm()
                    }}
                    style={{ width: '100%', padding: '8px 10px', marginBottom: 10 }}
                />
                <div style={{ textAlign: 'right' }}>
                    <button
                        onClick={() => confirm()}
                        style={{ padding: '6px 12px' }}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    )
}

function App() {
    const [ready, setReady] = useState(false)
    const [name, setName] = useState<string | null>(null)

    // Do NOT persist name. Each browser tab should prompt independently.
    const handleConfirm = (inputName: string) => {
        const trimmed = inputName.trim()
        setName(trimmed.length > 0 ? trimmed : '')
        setReady(true)
    }

    if (!ready) {
        return <NamePrompt onConfirm={handleConfirm} />
    }

    return <Game playerName={name ?? ''} />
}

export default App
