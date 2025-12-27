'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, Square, Bell, Coffee, Clock, Thermometer, Volume2 } from 'lucide-react'

interface RoastStep {
  time: string
  settings: Record<string, any>
  temperature: string
  notes: string
}

interface RoastTimerProps {
  roastProfile?: RoastStep[]
  onRoastComplete?: (roastData: RoastData) => void
}

interface RoastData {
  totalTime: number
  firstCrackTime: number | null
  developmentTime: number | null
  developmentRatio: number | null
  steps: Array<{
    time: number
    event: string
    temperature?: string
    notes?: string
  }>
}

export function RoastTimer({ roastProfile, onRoastComplete }: RoastTimerProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [time, setTime] = useState(0) // in seconds
  const [firstCrackTime, setFirstCrackTime] = useState<number | null>(null)
  const [developmentTime, setDevelopmentTime] = useState<number | null>(null)
  const [currentTemp, setCurrentTemp] = useState('')
  const [notes, setNotes] = useState('')
  const [roastSteps, setRoastSteps] = useState<Array<{
    time: number
    event: string
    temperature?: string
    notes?: string
  }>>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [nextAlert, setNextAlert] = useState<RoastStep | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTime(prev => prev + 1)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning])

  // Check for profile alerts - countdown to specific steps
  useEffect(() => {
    if (!roastProfile || !isRunning) return

    const currentTimeStr = formatTime(time)
    
    // Find the next step that hasn't been reached yet
    const nextStep = roastProfile.find(step => {
      const stepTime = timeStringToSeconds(step.time)
      return stepTime > time
    })

    // Alert at specific countdown intervals: 60s, 30s, 10s before each step
    if (nextStep) {
      const stepTime = timeStringToSeconds(nextStep.time)
      const timeUntilStep = stepTime - time
      
      // Alert at 60s, 30s, and 10s before each step
      if (timeUntilStep === 60 || timeUntilStep === 30 || timeUntilStep === 10) {
        if (nextStep !== nextAlert || timeUntilStep === 10) {
          setNextAlert(nextStep)
          if (soundEnabled) {
            // Different tones for different countdown intervals
            const frequency = timeUntilStep === 60 ? 330 : timeUntilStep === 30 ? 440 : 550
            playNotificationSound(frequency, 200)
          }
        }
      }
    }

    // Check if we've hit a step exactly
    const currentStep = roastProfile.find(step => step.time === currentTimeStr)
    if (currentStep && soundEnabled) {
      playNotificationSound(880, 500) // Higher pitched bell for exact timing
      setNextAlert(null) // Clear the next alert since we've reached this step
    }
  }, [time, roastProfile, isRunning, nextAlert, soundEnabled])

  // Calculate development time when first crack is set
  useEffect(() => {
    if (firstCrackTime !== null && time > firstCrackTime) {
      setDevelopmentTime(time - firstCrackTime)
    }
  }, [time, firstCrackTime])

  const timeStringToSeconds = (timeStr: string): number => {
    const [minutes, seconds] = timeStr.split(':').map(Number)
    return minutes * 60 + seconds
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const playNotificationSound = (frequency: number, duration: number) => {
    if (!audioContextRef.current || !soundEnabled) return

    try {
      const oscillator = audioContextRef.current.createOscillator()
      const gainNode = audioContextRef.current.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContextRef.current.destination)
      
      oscillator.frequency.value = frequency
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration / 1000)
      
      oscillator.start(audioContextRef.current.currentTime)
      oscillator.stop(audioContextRef.current.currentTime + duration / 1000)
    } catch (error) {
      console.error('Error playing notification sound:', error)
    }
  }

  const startTimer = () => {
    setIsRunning(true)
    if (roastSteps.length === 0) {
      setRoastSteps([{ time: 0, event: 'Roast Started' }])
    }
  }

  const pauseTimer = () => {
    setIsRunning(false)
    setRoastSteps(prev => [...prev, { time, event: 'Roast Paused' }])
  }

  const stopTimer = () => {
    setIsRunning(false)
    
    const developmentRatio = firstCrackTime && developmentTime 
      ? (developmentTime / firstCrackTime) * 100 
      : null

    const finalRoastData: RoastData = {
      totalTime: time,
      firstCrackTime,
      developmentTime,
      developmentRatio,
      steps: [...roastSteps, { time, event: 'Roast Finished' }]
    }

    onRoastComplete?.(finalRoastData)
    
    // Reset for next roast
    setTime(0)
    setFirstCrackTime(null)
    setDevelopmentTime(null)
    setRoastSteps([])
    setCurrentTemp('')
    setNotes('')
    setNextAlert(null)
  }

  const markFirstCrack = () => {
    if (firstCrackTime === null) {
      setFirstCrackTime(time)
      setRoastSteps(prev => [...prev, { 
        time, 
        event: 'First Crack', 
        temperature: currentTemp,
        notes: 'First crack detected'
      }])
      if (soundEnabled) {
        // Play first crack bell sound
        playNotificationSound(660, 500)
        setTimeout(() => playNotificationSound(880, 500), 600)
      }
    }
  }

  const addCustomEvent = () => {
    if (notes.trim()) {
      setRoastSteps(prev => [...prev, { 
        time, 
        event: 'Custom Event', 
        temperature: currentTemp,
        notes: notes.trim()
      }])
      setNotes('')
    }
  }

  const developmentRatio = firstCrackTime && developmentTime 
    ? ((developmentTime / firstCrackTime) * 100).toFixed(1)
    : null

  const getCurrentProfileStep = () => {
    if (!roastProfile) return null
    const currentTimeStr = formatTime(time)
    return roastProfile.find(step => step.time === currentTimeStr)
  }

  const currentProfileStep = getCurrentProfileStep()

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Coffee className="h-6 w-6 text-orange-600" />
          <h2 className="text-2xl font-bold text-gray-900">Roast Timer</h2>
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-2 rounded-lg ${soundEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}
          title="Toggle sound notifications"
        >
          <Volume2 className="h-5 w-5" />
        </button>
      </div>

      {/* Main Timer Display */}
      <div className="text-center">
        <div className="text-6xl font-mono font-bold text-gray-900 mb-2">
          {formatTime(time)}
        </div>
        <div className="text-lg text-gray-600">
          {isRunning ? 'Roasting...' : time > 0 ? 'Paused' : 'Ready to start'}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex justify-center gap-4">
        {!isRunning ? (
          <button
            onClick={startTimer}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold"
          >
            <Play className="h-5 w-5" />
            {time > 0 ? 'Resume' : 'Start Roast'}
          </button>
        ) : (
          <button
            onClick={pauseTimer}
            className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-semibold"
          >
            <Pause className="h-5 w-5" />
            Pause
          </button>
        )}
        
        <button
          onClick={stopTimer}
          disabled={time === 0}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold"
        >
          <Square className="h-5 w-5" />
          Stop
        </button>

        <button
          onClick={markFirstCrack}
          disabled={!isRunning || firstCrackTime !== null}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold"
        >
          <Bell className="h-5 w-5" />
          First Crack
        </button>
      </div>

      {/* Development Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">First Crack</h3>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {firstCrackTime !== null ? formatTime(firstCrackTime) : '--:--'}
          </p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-purple-900">Development</h3>
          </div>
          <p className="text-2xl font-bold text-purple-600">
            {developmentTime !== null ? formatTime(developmentTime) : '--:--'}
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Coffee className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-green-900">Dev Ratio</h3>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {developmentRatio ? `${developmentRatio}%` : '--%'}
          </p>
          <p className="text-xs text-green-700 mt-1">
            {developmentRatio && parseFloat(developmentRatio) >= 15 && parseFloat(developmentRatio) <= 25
              ? 'Good range' 
              : developmentRatio
              ? parseFloat(developmentRatio) < 15 
                ? 'Too fast' 
                : 'Too slow'
              : '15-25% ideal'}
          </p>
        </div>
      </div>

      {/* Current Profile Step */}
      {currentProfileStep && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h3 className="font-semibold text-orange-900 mb-2">Current Profile Step</h3>
          <div className="space-y-2">
            {Object.entries(currentProfileStep.settings || {}).map(([key, value]) => (
              <span key={key} className="inline-block mr-2 text-sm bg-orange-100 text-orange-800 px-2 py-1 rounded">
                {key}: {value}
              </span>
            ))}
            <p className="text-sm text-orange-700 mt-2">{currentProfileStep.notes}</p>
          </div>
        </div>
      )}

      {/* Next Alert */}
      {nextAlert && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">
            Next Step: {nextAlert.time} (in {timeStringToSeconds(nextAlert.time) - time}s)
          </h3>
          <p className="text-sm text-yellow-700">{nextAlert.notes}</p>
          <p className="text-xs text-yellow-600 mt-1">
            Alerts at: 60s, 30s, and 10s before step
          </p>
        </div>
      )}

      {/* Temperature & Notes Input */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Thermometer className="inline h-4 w-4 mr-1" />
            Current Temperature
          </label>
          <input
            type="text"
            value={currentTemp}
            onChange={(e) => setCurrentTemp(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="e.g., 450°F"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Event Notes
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCustomEvent()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Add custom event..."
            />
            <button
              onClick={addCustomEvent}
              disabled={!notes.trim()}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Roast Log */}
      {roastSteps.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Roast Log</h3>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {roastSteps.map((step, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div>
                  <span className="font-medium text-gray-900">{formatTime(step.time)}</span>
                  <span className="ml-3 text-gray-700">{step.event}</span>
                  {step.notes && <span className="ml-2 text-sm text-gray-500">- {step.notes}</span>}
                </div>
                {step.temperature && (
                  <span className="text-sm text-orange-600 font-medium">{step.temperature}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}