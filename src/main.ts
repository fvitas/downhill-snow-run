import './style.css'
import { createGame } from './app.ts'

const stage = document.querySelector<HTMLElement>('#stage')
const canvas = document.querySelector<HTMLCanvasElement>('#game')
const overlay = document.querySelector<HTMLElement>('#overlay')
const overlayMessage = document.querySelector<HTMLElement>('#overlay-message')

if (!stage || !canvas || !overlay || !overlayMessage) throw new Error('Missing stage markup')

const game = createGame({ stage, canvas, overlay, overlayMessage })

if (import.meta.env.DEV) Reflect.set(window, 'ski', game.state)
