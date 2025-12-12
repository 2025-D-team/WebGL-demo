interface GameUIProps {
    showEmojiPicker: boolean
    setShowEmojiPicker: (show: boolean) => void
    notification: string | null
    onEmojiSelect: (emoji: string) => void
}

/**
 * Component for game UI elements (emoji picker and notifications)
 */
export const GameUI = ({ showEmojiPicker, setShowEmojiPicker, notification, onEmojiSelect }: GameUIProps) => {
    // Emoji list for picker
    const emojis = [
        '😄',
        '😀',
        '😂',
        '🤣',
        '😊',
        '🙂',
        '😉',
        '😍',
        '😘',
        '🥰',
        '😇',
        '🤩',
        '😮',
        '😲',
        '😢',
        '😡',
        '😤',
        '😱',
        '👍',
        '👎',
        '👏',
        '🙏',
        '🤝',
        '🤘',
        '🤞',
        '✌️',
        '👌',
        '🤏',
        '🎉',
        '🎊',
        '❤️',
        '💔',
        '🔥',
        '🌟',
        '✨',
        '⭐',
        '🌈',
        '☀️',
        '🍕',
        '🍔',
        '🍣',
        '🍩',
        '🍪',
        '☕',
        '🍺',
        '🍷',
        '🏆',
        '🎮',
        '🐶',
        '🐱',
        '🐼',
        '🐵',
        '🦊',
        '🦁',
        '🐯',
        '🐸',
        '🐙',
        '🐧',
        '🤖',
        '👾',
        '💡',
        '📣',
        '📌',
        '🔔',
        '🎵',
        '🎧',
        '🧭',
        '🪄',
    ]

    return (
        <>
            {/* Emoji button + picker (DOM overlay) */}
            <div style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 9999 }}>
                <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    style={{ padding: '8px 12px', fontSize: 16, borderRadius: 8 }}
                >
                    😊
                </button>

                {showEmojiPicker && (
                    <div
                        style={{
                            marginTop: 8,
                            background: 'rgba(0,0,0,0.85)',
                            padding: 8,
                            borderRadius: 8,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(6, 40px)',
                            gap: 8,
                            maxHeight: 220,
                            overflowY: 'auto',
                            boxShadow: '0 6px 30px rgba(0,0,0,0.5)',
                        }}
                    >
                        {emojis.map((e) => (
                            <button
                                key={e}
                                onClick={() => onEmojiSelect(e)}
                                style={{ fontSize: 20, width: 40, height: 40, borderRadius: 6 }}
                            >
                                {e}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Success notification popup */}
            {notification && (
                <div
                    style={{
                        position: 'absolute',
                        top: 20,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(255, 255, 255, 0.95)',
                        color: '#333',
                        padding: '8px 16px',
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: '500',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                        zIndex: 10000,
                        pointerEvents: 'none',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                    }}
                >
                    ✓ {notification}
                </div>
            )}
        </>
    )
}
