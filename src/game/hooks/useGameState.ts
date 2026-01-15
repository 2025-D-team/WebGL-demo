import { useRef, useState } from 'react'

import * as PIXI from 'pixi.js'

import { Character } from '../Character'
import { ChestEntity } from '../ChestEntity'
import { InputHandler } from '../InputHandler'
import { MultiplayerManager, type RankingPlayer } from '../MultiplayerManager'
import { RemotePlayer } from '../RemotePlayer'

/**
 * Hook to manage all game state and refs
 * Centralizes state management for the Game component
 */
export const useGameState = () => {
    // PIXI refs
    const mapContainerRef = useRef<PIXI.Container | null>(null)

    // Game entity refs
    const characterRef = useRef<Character | null>(null)
    const inputHandlerRef = useRef<InputHandler | null>(null)
    const remotePlayersRef = useRef<Map<string, RemotePlayer>>(new Map())
    const chestsRef = useRef<Map<string, ChestEntity>>(new Map())

    // Multiplayer ref
    const multiplayerRef = useRef<MultiplayerManager | null>(null)

    // Chest interaction state
    const nearbyChestRef = useRef<string | null>(null)
    const [nearbyChest, setNearbyChest] = useState<string | null>(null)
    const [nearbyChestPos, setNearbyChestPos] = useState<{ x: number; y: number } | null>(null)

    // UI state
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [notification, setNotification] = useState<string | null>(null)
    const [ranking, setRanking] = useState<RankingPlayer[]>([])
    const [questionData, setQuestionData] = useState<{
        chestId: string
        question: string
        timeLimit: number
    } | null>(null)
    const [isGrading, setIsGrading] = useState(false)

    // Game ready state
    const [characterReady, setCharacterReady] = useState(false)

    return {
        // Refs
        mapContainerRef,
        characterRef,
        inputHandlerRef,
        remotePlayersRef,
        chestsRef,
        multiplayerRef,
        nearbyChestRef,

        // State
        nearbyChest,
        setNearbyChest,
        nearbyChestPos,
        setNearbyChestPos,
        showEmojiPicker,
        setShowEmojiPicker,
        notification,
        setNotification,
        ranking,
        setRanking,
        questionData,
        setQuestionData,
        isGrading,
        setIsGrading,
        characterReady,
        setCharacterReady,
    }
}
