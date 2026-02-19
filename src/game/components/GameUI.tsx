import { useMemo, useState } from 'react'

import { type CatalogEquipmentItem, type EquipmentSlot, type PlayerEquipment } from '../equipment/types'
import { type WorldMessageData } from '../MultiplayerManager'

interface GameUIProps {
    showEmojiPicker: boolean
    setShowEmojiPicker: (show: boolean) => void
    notification: string | null
    onEmojiSelect: (emoji: string) => void
    showInventory: boolean
    setShowInventory: (show: boolean) => void
    showShop: boolean
    setShowShop: (show: boolean) => void
    itemCatalog: CatalogEquipmentItem[]
    inventory: string[]
    equippedItems: PlayerEquipment | null
    playerScore: number | null
    worldMessages: WorldMessageData[]
    onEquipItem: (slot: EquipmentSlot, itemId: string | null) => void
    onPurchaseItem: (itemId: string) => void
}

const SLOT_LABELS: Record<EquipmentSlot, string> = {
    head: '頭',
    armor: '鎧',
    foot: '脚',
}

const TAB_LABELS: Record<EquipmentSlot, string> = {
    head: '頭装備',
    armor: '鎧装備',
    foot: '脚装備',
}

const BASE_PREVIEW_IMAGE = '/char_demo/frames/walk-down-001.png'

export const GameUI = ({
    showEmojiPicker,
    setShowEmojiPicker,
    notification,
    onEmojiSelect,
    showInventory,
    setShowInventory,
    showShop,
    setShowShop,
    itemCatalog,
    inventory,
    equippedItems,
    playerScore,
    worldMessages,
    onEquipItem,
    onPurchaseItem,
}: GameUIProps) => {
    const [activeInventoryTab, setActiveInventoryTab] = useState<EquipmentSlot>('head')
    const [activeShopTab, setActiveShopTab] = useState<EquipmentSlot>('head')

    const ownedItems = useMemo(() => {
        const ownedSet = new Set(inventory)
        return itemCatalog.filter((item) => ownedSet.has(item.id))
    }, [itemCatalog, inventory])

    const inventoryTabItems = useMemo(
        () => ownedItems.filter((item) => item.slot === activeInventoryTab),
        [ownedItems, activeInventoryTab]
    )

    const shopTabItems = useMemo(
        () => itemCatalog.filter((item) => item.slot === activeShopTab),
        [itemCatalog, activeShopTab]
    )

    const equippedBySlot = useMemo(() => {
        const bySlot: Record<EquipmentSlot, CatalogEquipmentItem | null> = {
            head: null,
            armor: null,
            foot: null,
        }
        for (const item of itemCatalog) {
            if (equippedItems?.[item.slot] === item.id) {
                bySlot[item.slot] = item
            }
        }
        return bySlot
    }, [itemCatalog, equippedItems])

    const emojis = ['😄', '😀', '😂', '🤣', '😊', '🙂', '😉', '😍', '😘', '🥰', '😇', '🤩', '😮', '😲', '😢', '😡']
    const formatWorldTime = (raw: string) => {
        const date = new Date(raw)
        if (Number.isNaN(date.getTime())) return '--:--'
        const mm = String(date.getMonth() + 1).padStart(2, '0')
        const dd = String(date.getDate()).padStart(2, '0')
        const hh = String(date.getHours()).padStart(2, '0')
        const min = String(date.getMinutes()).padStart(2, '0')
        return `${mm}/${dd} ${hh}:${min}`
    }

    return (
        <>
            <div
                style={{
                    position: 'absolute',
                    left: 20,
                    bottom: 20,
                    zIndex: 9999,
                    display: 'grid',
                    justifyItems: 'start',
                    gap: 10,
                }}
            >
                <button
                    onClick={() => setShowInventory(!showInventory)}
                    style={{
                        width: 84,
                        height: 84,
                        borderRadius: 14,
                        border: showInventory ? '2px solid #7dd3fc' : '2px solid rgba(255,255,255,0.35)',
                        background:
                            showInventory ?
                                'linear-gradient(180deg, rgba(56,189,248,0.3), rgba(15,23,42,0.9))'
                            :   'linear-gradient(180deg, rgba(30,41,59,0.95), rgba(2,6,23,0.95))',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
                        display: 'grid',
                        placeItems: 'center',
                        padding: 0,
                    }}
                    title='インベントリ'
                >
                    <img
                        src='/icon/bag.png'
                        alt='inventory'
                        style={{ width: 52, height: 52, objectFit: 'contain', imageRendering: 'pixelated' }}
                    />
                </button>
                <button
                    onClick={() => setShowShop(!showShop)}
                    style={{
                        width: 84,
                        height: 84,
                        borderRadius: 14,
                        border: showShop ? '2px solid #fcd34d' : '2px solid rgba(255,255,255,0.35)',
                        background:
                            showShop ?
                                'linear-gradient(180deg, rgba(250,204,21,0.28), rgba(15,23,42,0.9))'
                            :   'linear-gradient(180deg, rgba(30,41,59,0.95), rgba(2,6,23,0.95))',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
                        display: 'grid',
                        placeItems: 'center',
                        padding: 0,
                    }}
                    title='ショップ'
                >
                    <img
                        src='/icon/shop.png'
                        alt='shop'
                        style={{ width: 52, height: 52, objectFit: 'contain', imageRendering: 'pixelated' }}
                    />
                </button>
            </div>

            <div
                style={{
                    position: 'absolute',
                    right: 20,
                    bottom: 20,
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 10,
                }}
            >
                <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    style={{
                        width: 42,
                        height: 42,
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.35)',
                        background: 'linear-gradient(180deg, rgba(30,41,59,0.96), rgba(2,6,23,0.96))',
                        color: '#fff',
                        fontSize: 20,
                    }}
                    title='ワールドメッセージ'
                >
                    😊
                </button>

                <div
                    style={{
                        width: 360,
                        minHeight: 132,
                        maxHeight: 160,
                        borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.22)',
                        background: 'rgba(0,0,0,0.58)',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.45)',
                        padding: '8px 10px',
                        overflowY: 'auto',
                    }}
                >
                    {worldMessages.length === 0 ?
                        <div style={{ color: '#cbd5e1', fontSize: 12, opacity: 0.8 }}>World Message</div>
                    :   worldMessages.map((msg) => (
                            <div
                                key={msg.id}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '78px 1fr',
                                    gap: 8,
                                    alignItems: 'center',
                                    fontSize: 12,
                                    lineHeight: 1.35,
                                    marginBottom: 4,
                                }}
                            >
                                <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>
                                    {formatWorldTime(msg.created_at)}
                                </span>
                                <span style={{ color: msg.color_hex || '#e2e8f0' }}>{msg.message_text}</span>
                            </div>
                        ))
                    }
                </div>
            </div>

            {showEmojiPicker && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: 72,
                        right: 20,
                        background: 'rgba(0,0,0,0.85)',
                        padding: 8,
                        borderRadius: 8,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 40px)',
                        gap: 8,
                        maxHeight: 220,
                        overflowY: 'auto',
                        boxShadow: '0 6px 30px rgba(0,0,0,0.5)',
                        zIndex: 10002,
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

            {showInventory && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.55)',
                        zIndex: 10010,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                    onClick={() => setShowInventory(false)}
                >
                    <div
                        style={{
                            width: 920,
                            maxWidth: '95vw',
                            height: 560,
                            maxHeight: '90vh',
                            background: 'linear-gradient(135deg, #10131e 0%, #0f172a 100%)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 12,
                            color: '#e2e8f0',
                            display: 'grid',
                            gridTemplateColumns: '360px 1fr',
                            overflow: 'hidden',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            style={{
                                borderRight: '1px solid rgba(255,255,255,0.08)',
                                padding: 16,
                                display: 'grid',
                                gridTemplateRows: 'auto 1fr',
                                gap: 12,
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong>インベントリ</strong>
                            </div>

                            <div
                                style={{
                                    height: '100%',
                                    minHeight: 360,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{ display: 'grid', gap: 10 }}>
                                        {(['head', 'armor', 'foot'] as EquipmentSlot[]).map((slot) => {
                                            const equipped = equippedBySlot[slot]
                                            return (
                                                <div
                                                    key={slot}
                                                    style={{
                                                        width: 82,
                                                        height: 82,
                                                        border: '1px solid rgba(255,255,255,0.16)',
                                                        borderRadius: 10,
                                                        background: 'rgba(255,255,255,0.04)',
                                                        display: 'grid',
                                                        alignContent: 'center',
                                                        justifyItems: 'center',
                                                        gap: 4,
                                                        padding: 6,
                                                    }}
                                                >
                                                    <div style={{ fontSize: 11, opacity: 0.8 }}>{SLOT_LABELS[slot]}</div>
                                                    {equipped ?
                                                        <img
                                                            src={equipped.assets.down}
                                                            alt={equipped.name}
                                                            style={{
                                                                width: 34,
                                                                height: 34,
                                                                imageRendering: 'pixelated',
                                                                objectFit: 'contain',
                                                            }}
                                                        />
                                                    :   <div style={{ fontSize: 18, opacity: 0.45 }}>□</div>}
                                                    <button
                                                        onClick={() => onEquipItem(slot, null)}
                                                        style={{ fontSize: 10, padding: '2px 6px' }}
                                                    >
                                                        解除
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    <div
                                        style={{
                                            width: 220,
                                            height: 320,
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: 10,
                                            background:
                                                'radial-gradient(circle at 50% 35%, rgba(99,179,237,0.2), rgba(15,23,42,0.2) 60%)',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <div style={{ position: 'relative', width: 150, height: 150 }}>
                                            <img
                                                src={BASE_PREVIEW_IMAGE}
                                                alt='character preview'
                                                style={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'contain',
                                                    imageRendering: 'pixelated',
                                                }}
                                            />
                                            {equippedBySlot.foot && (
                                                <img
                                                    src={equippedBySlot.foot.assets.down}
                                                    alt='foot equipment'
                                                    style={{
                                                        position: 'absolute',
                                                        inset: 0,
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'contain',
                                                        imageRendering: 'pixelated',
                                                    }}
                                                />
                                            )}
                                            {equippedBySlot.armor && (
                                                <img
                                                    src={equippedBySlot.armor.assets.down}
                                                    alt='armor equipment'
                                                    style={{
                                                        position: 'absolute',
                                                        inset: 0,
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'contain',
                                                        imageRendering: 'pixelated',
                                                    }}
                                                />
                                            )}
                                            {equippedBySlot.head && (
                                                <img
                                                    src={equippedBySlot.head.assets.down}
                                                    alt='head equipment'
                                                    style={{
                                                        position: 'absolute',
                                                        inset: 0,
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'contain',
                                                        imageRendering: 'pixelated',
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: 16, display: 'grid', gridTemplateRows: 'auto auto 1fr', gap: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: 700 }}>所持装備</div>
                                <button onClick={() => setShowInventory(false)}>✖</button>
                            </div>

                            <div style={{ display: 'flex', gap: 8 }}>
                                {(['head', 'armor', 'foot'] as EquipmentSlot[]).map((slot) => (
                                    <button
                                        key={slot}
                                        onClick={() => setActiveInventoryTab(slot)}
                                        style={{
                                            padding: '6px 10px',
                                            borderRadius: 8,
                                            border: '1px solid rgba(255,255,255,0.14)',
                                            background:
                                                activeInventoryTab === slot ? 'rgba(56,189,248,0.28)' : 'transparent',
                                            color: '#e2e8f0',
                                        }}
                                    >
                                        {TAB_LABELS[slot]}
                                    </button>
                                ))}
                            </div>

                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                                    gap: 10,
                                    alignContent: 'start',
                                    overflowY: 'auto',
                                }}
                            >
                                {inventoryTabItems.map((item) => {
                                    const isEquipped = equippedItems?.[item.slot] === item.id
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => onEquipItem(item.slot, item.id)}
                                            style={{
                                                borderRadius: 8,
                                                border:
                                                    isEquipped ?
                                                        '1px solid rgba(34,197,94,0.9)'
                                                    :   '1px solid rgba(255,255,255,0.14)',
                                                background:
                                                    isEquipped ? 'rgba(34,197,94,0.14)' : 'rgba(255,255,255,0.03)',
                                                color: '#e2e8f0',
                                                padding: 8,
                                                minHeight: 96,
                                                display: 'grid',
                                                gap: 6,
                                                justifyItems: 'center',
                                            }}
                                        >
                                            <img
                                                src={item.assets.down}
                                                alt={item.name}
                                                style={{
                                                    width: 40,
                                                    height: 40,
                                                    objectFit: 'contain',
                                                    imageRendering: 'pixelated',
                                                }}
                                            />
                                            <span style={{ fontSize: 11, lineHeight: 1.2 }}>{item.name}</span>
                                        </button>
                                    )
                                })}
                                {inventoryTabItems.length === 0 && (
                                    <div style={{ opacity: 0.7, fontSize: 13 }}>このタブにアイテムがありません。</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showShop && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.55)',
                        zIndex: 10011,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                    onClick={() => setShowShop(false)}
                >
                    <div
                        style={{
                            width: 760,
                            maxWidth: '95vw',
                            height: 540,
                            maxHeight: '90vh',
                            background: 'linear-gradient(135deg, #10131e 0%, #0f172a 100%)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 12,
                            color: '#e2e8f0',
                            overflow: 'hidden',
                            padding: 16,
                            display: 'grid',
                            gridTemplateRows: 'auto 1fr',
                            gap: 12,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong>ショップ</strong>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: 999,
                                        border: '1px solid rgba(250,204,21,0.45)',
                                        background: 'rgba(234,179,8,0.14)',
                                        color: '#fde68a',
                                        fontSize: 13,
                                        fontWeight: 700,
                                    }}
                                >
                                    所持ポイント: {playerScore ?? 0}
                                </div>
                                <button onClick={() => setShowShop(false)}>✖</button>
                            </div>
                        </div>

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '86px 1fr',
                                gap: 12,
                                minHeight: 0,
                            }}
                        >
                            <div
                                style={{
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    borderRadius: 10,
                                    background: 'rgba(10,14,24,0.55)',
                                    padding: 8,
                                    display: 'grid',
                                    gap: 8,
                                    alignContent: 'start',
                                }}
                            >
                                {(['head', 'armor', 'foot'] as EquipmentSlot[]).map((slot) => {
                                    const icon = slot === 'head' ? '⛑' : slot === 'armor' ? '🛡' : '🥾'
                                    return (
                                        <button
                                            key={slot}
                                            onClick={() => setActiveShopTab(slot)}
                                            title={TAB_LABELS[slot]}
                                            style={{
                                                width: '100%',
                                                height: 64,
                                                borderRadius: 8,
                                                border: '1px solid rgba(255,255,255,0.2)',
                                                background:
                                                    activeShopTab === slot ?
                                                        'linear-gradient(180deg, rgba(56,189,248,0.4) 0%, rgba(8,47,73,0.5) 100%)'
                                                    :   'rgba(255,255,255,0.04)',
                                                color: '#e2e8f0',
                                                display: 'grid',
                                                justifyItems: 'center',
                                                alignContent: 'center',
                                                gap: 2,
                                            }}
                                        >
                                            <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
                                            <span style={{ fontSize: 10 }}>{SLOT_LABELS[slot]}</span>
                                        </button>
                                    )
                                })}
                            </div>

                            <div
                                style={{
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    borderRadius: 10,
                                    background: 'rgba(10,14,24,0.45)',
                                    padding: 12,
                                    overflowY: 'auto',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                                        gap: 10,
                                        alignContent: 'start',
                                    }}
                                >
                                    {shopTabItems.map((item) => {
                                        const owned = inventory.includes(item.id)
                                        return (
                                            <div
                                                key={item.id}
                                                style={{
                                                    borderRadius: 8,
                                                    border: '1px solid rgba(148,163,184,0.35)',
                                                    background:
                                                        'linear-gradient(180deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.95) 100%)',
                                                    color: '#e2e8f0',
                                                    padding: 8,
                                                    minHeight: 148,
                                                    display: 'grid',
                                                    gap: 6,
                                                    justifyItems: 'center',
                                                    alignContent: 'start',
                                                }}
                                            >
                                                <img
                                                    src={item.assets.down}
                                                    alt={item.name}
                                                    style={{
                                                        width: 42,
                                                        height: 42,
                                                        objectFit: 'contain',
                                                        imageRendering: 'pixelated',
                                                    }}
                                                />
                                                <span style={{ fontSize: 11, lineHeight: 1.2, textAlign: 'center' }}>
                                                    {item.name}
                                                </span>
                                                <span style={{ fontSize: 11, color: '#fcd34d' }}>価格: {item.price}pt</span>
                                                {owned ?
                                                    <button
                                                        disabled
                                                        style={{
                                                            fontSize: 11,
                                                            padding: '4px 8px',
                                                            borderRadius: 6,
                                                            background: '#4a5568',
                                                            color: '#cbd5e1',
                                                            cursor: 'default',
                                                        }}
                                                    >
                                                        購入済み
                                                    </button>
                                                :   <button
                                                        onClick={() => onPurchaseItem(item.id)}
                                                        style={{
                                                            fontSize: 11,
                                                            padding: '4px 8px',
                                                            borderRadius: 6,
                                                            background: '#2f855a',
                                                            color: '#fff',
                                                        }}
                                                    >
                                                        購入
                                                    </button>
                                                }
                                            </div>
                                        )
                                    })}
                                    {shopTabItems.length === 0 && (
                                        <div style={{ opacity: 0.7, fontSize: 13 }}>このタブに商品がありません。</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
