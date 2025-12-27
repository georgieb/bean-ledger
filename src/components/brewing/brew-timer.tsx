'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, Square, Bell, Coffee, Clock, Volume2, Droplets, CheckCircle } from 'lucide-react'

interface BrewStep {
  step_number: number
  time: string
  action: string
  visual_cues: string
  notes: string
}

interface BrewTimerProps {
  brewSteps?: BrewStep[]
  onBrewComplete?: (brewData: BrewData) => void
  totalBrewTime?: string // e.g. "3:30-4:00"
  coffeeName?: string
  brewMethod?: string
}

interface BrewData {
  totalTime: number
  steps: Array<{
    time: number
    event: string
    notes?: string
    completed: boolean
  }>
  brewMethod: string
  coffeeName: string
}

export function BrewTimer({ brewSteps, onBrewComplete, totalBrewTime, coffeeName, brewMethod }: BrewTimerProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [time, setTime] = useState(0) // in seconds
  const [notes, setNotes] = useState('')
  const [timerSteps, setTimerSteps] = useState<Array<{
    time: number
    event: string
    notes?: string
    completed: boolean
  }>>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [nextAlert, setNextAlert] = useState<BrewStep | null>(null)
  const [currentStep, setCurrentStep] = useState<BrewStep | null>(null)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

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

  // Check for brewing step alerts
  useEffect(() => {
    if (!brewSteps || !isRunning) return

    const currentTimeStr = formatTime(time)
    
    // Find the current step that should be happening now
    const activeStep = brewSteps.find(step => {
      const stepTime = timeStringToSeconds(step.time)
      // Consider a step "current" if we're within 15 seconds of it
      return Math.abs(stepTime - time) <= 15 && stepTime <= time + 15
    })

    if (activeStep && currentStep?.step_number !== activeStep.step_number) {
      setCurrentStep(activeStep)
      if (soundEnabled) {
        playNotificationSound(660, 300) // Step notification sound
      }
    }

    // Check for exact step timing
    const exactStep = brewSteps.find(step => step.time === currentTimeStr)
    if (exactStep && !completedSteps.has(exactStep.step_number)) {
      setCompletedSteps(prev => new Set([...Array.from(prev), exactStep.step_number]))
      setTimerSteps(prev => [...prev, {
        time,
        event: exactStep.action,
        notes: exactStep.visual_cues,
        completed: true
      }])
      
      if (soundEnabled) {
        playNotificationSound(880, 500) // Exact timing bell
      }
    }

    // Alert for upcoming steps (30s, 15s, 5s before)
    const upcomingStep = brewSteps.find(step => {
      const stepTime = timeStringToSeconds(step.time)
      const timeUntilStep = stepTime - time
      return timeUntilStep > 0 && timeUntilStep <= 30
    })

    if (upcomingStep) {
      const stepTime = timeStringToSeconds(upcomingStep.time)
      const timeUntilStep = stepTime - time
      
      if (timeUntilStep === 30 || timeUntilStep === 15 || timeUntilStep === 5) {
        setNextAlert(upcomingStep)
        if (soundEnabled) {
          const frequency = timeUntilStep === 30 ? 330 : timeUntilStep === 15 ? 440 : 550
          playNotificationSound(frequency, 200)
        }
      }
    }

    // Clear alert when step is reached
    if (nextAlert && time >= timeStringToSeconds(nextAlert.time)) {
      setNextAlert(null)
    }
  }, [time, brewSteps, isRunning, soundEnabled, currentStep, completedSteps])

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
    if (timerSteps.length === 0) {
      setTimerSteps([{ time: 0, event: 'Brew Started', completed: true }])
    }
  }

  const pauseTimer = () => {
    setIsRunning(false)
    setTimerSteps(prev => [...prev, { time, event: 'Brew Paused', completed: true }])
  }

  const stopTimer = () => {
    setIsRunning(false)
    
    const finalBrewData: BrewData = {
      totalTime: time,
      steps: [...timerSteps, { time, event: 'Brew Finished', completed: true }],
      brewMethod: brewMethod || 'Unknown',
      coffeeName: coffeeName || 'Unknown Coffee'
    }

    onBrewComplete?.(finalBrewData)
    
    // Reset for next brew
    setTime(0)
    setTimerSteps([])
    setCurrentStep(null)
    setCompletedSteps(new Set())
    setNextAlert(null)
    setNotes('')
  }

  const markStepComplete = () => {
    if (currentStep) {
      setCompletedSteps(prev => new Set([...Array.from(prev), currentStep.step_number]))
      setTimerSteps(prev => [...prev, {
        time,
        event: `Completed: ${currentStep.action}`,
        notes: notes.trim() || currentStep.notes,
        completed: true
      }])
      setNotes('')
      
      if (soundEnabled) {
        playNotificationSound(750, 300) // Manual completion sound
      }
    }
  }

  const addCustomEvent = () => {
    if (notes.trim()) {
      setTimerSteps(prev => [...prev, { 
        time, 
        event: 'Custom Note', 
        notes: notes.trim(),
        completed: true
      }])
      setNotes('')
    }
  }

  // Parse total brew time for target display
  const getTargetTime = () => {
    if (!totalBrewTime) return null
    const match = totalBrewTime.match(/(\d+):(\d+)/)
    if (match) {
      return parseInt(match[1]) * 60 + parseInt(match[2])
    }
    return null
  }

  const targetTime = getTargetTime()
  const isOverTime = targetTime && time > targetTime
  const isNearTarget = targetTime && time >= targetTime - 30 && time <= targetTime + 30

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Droplets className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Brew Timer</h2>
            {(coffeeName || brewMethod) && (
              <p className="text-sm text-gray-600">
                {coffeeName} • {brewMethod}
              </p>
            )}
          </div>
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
        <div className={`text-6xl font-mono font-bold mb-2 ${
          isOverTime ? 'text-red-600' : isNearTarget ? 'text-amber-600' : 'text-gray-900'
        }`}>
          {formatTime(time)}
        </div>
        <div className="text-lg text-gray-600">
          {isRunning ? 'Brewing...' : time > 0 ? 'Paused' : 'Ready to start'}
          {targetTime && (
            <span className="ml-2 text-sm">
              (Target: {formatTime(targetTime)})
            </span>
          )}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex justify-center gap-4">
        {!isRunning ? (
          <button
            onClick={startTimer}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
          >
            <Play className="h-5 w-5" />
            {time > 0 ? 'Resume' : 'Start Brew'}
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
          onClick={markStepComplete}
          disabled={!isRunning || !currentStep || completedSteps.has(currentStep?.step_number || 0)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold"
        >
          <CheckCircle className="h-5 w-5" />
          Complete Step
        </button>
      </div>

      {/* Current Step Display */}
      {currentStep && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-blue-900">
              Current Step: {currentStep.action}
            </h3>
            <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {currentStep.time}
            </span>
          </div>
          {currentStep.visual_cues && (
            <p className="text-sm text-blue-700 mb-2">👁️ {currentStep.visual_cues}</p>
          )}
          {currentStep.notes && (
            <p className="text-sm text-blue-600">💡 {currentStep.notes}</p>
          )}
        </div>
      )}

      {/* Next Step Alert */}
      {nextAlert && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-900 mb-2">
            Next: {nextAlert.action} (in {timeStringToSeconds(nextAlert.time) - time}s)
          </h3>
          <p className="text-sm text-amber-700">{nextAlert.visual_cues}</p>
          <p className="text-xs text-amber-600 mt-1">
            Get ready for the next step!
          </p>
        </div>
      )}

      {/* All Brew Steps Overview */}
      {brewSteps && brewSteps.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Brewing Steps</h3>
          <div className="space-y-2">
            {brewSteps.map((step) => {
              const isCompleted = completedSteps.has(step.step_number)
              const isCurrent = currentStep?.step_number === step.step_number
              const stepTime = timeStringToSeconds(step.time)
              const isPast = time > stepTime
              
              return (
                <div 
                  key={step.step_number} 
                  className={`flex items-center gap-3 p-2 rounded ${
                    isCurrent ? 'bg-blue-100 border border-blue-300' :
                    isCompleted ? 'bg-green-100' : 
                    isPast ? 'bg-gray-100' : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    isCompleted ? 'bg-green-600 text-white' :
                    isCurrent ? 'bg-blue-600 text-white' :
                    'bg-gray-300 text-gray-600'
                  }`}>
                    {isCompleted ? '✓' : step.step_number}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isCurrent ? 'text-blue-900' : 'text-gray-900'}`}>
                        {step.action}
                      </span>
                      <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                        {step.time}
                      </span>
                    </div>
                    {step.visual_cues && (
                      <p className="text-xs text-gray-600 mt-1">{step.visual_cues}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Notes Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Brewing Notes
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addCustomEvent()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Add notes about taste, aroma, etc..."
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

      {/* Brew Log */}
      {timerSteps.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Brew Log</h3>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {timerSteps.map((step, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div>
                  <span className="font-medium text-gray-900">{formatTime(step.time)}</span>
                  <span className="ml-3 text-gray-700">{step.event}</span>
                  {step.notes && <span className="ml-2 text-sm text-gray-500">- {step.notes}</span>}
                </div>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}