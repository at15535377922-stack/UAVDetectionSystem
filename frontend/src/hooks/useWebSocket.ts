import { useEffect, useRef, useState, useCallback } from 'react'

interface UseWebSocketOptions {
  url: string
  enabled?: boolean
  reconnectInterval?: number
  onMessage?: (data: any) => void
}

export function useWebSocket({ url, enabled = true, reconnectInterval = 3000, onMessage }: UseWebSocketOptions) {
  const [connected, setConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<any>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    if (!enabled) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}${url}`

    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current)
          reconnectTimer.current = null
        }
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setLastMessage(data)
          onMessageRef.current?.(data)
        } catch {
          // ignore non-JSON messages
        }
      }

      ws.onclose = () => {
        setConnected(false)
        wsRef.current = null
        if (enabled) {
          reconnectTimer.current = setTimeout(connect, reconnectInterval)
        }
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch {
      // connection failed, retry
      reconnectTimer.current = setTimeout(connect, reconnectInterval)
    }
  }, [url, enabled, reconnectInterval])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data))
    }
  }, [])

  return { connected, lastMessage, send }
}
