"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trophy, Plus, MapPin, Phone, Globe, QrCode, Settings } from "lucide-react"
import { getMyBars } from "@/lib/bar-actions"
import type { Bar } from "@/lib/bar-actions"
import Header from "@/components/navigation/header"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@/lib/supabase/client"

export default function BarsPage() {
  const router = useRouter()
  const [bars, setBars] = useState<Bar[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (authUser) {
        try {
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single()
          
          if (userData && !error) {
            setUser(userData)
          } else {
            const user: User = {
              id: authUser.id,
              username: authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'user',
              email: authUser.email || '',
              display_name: authUser.user_metadata?.display_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
              avatar_url: authUser.user_metadata?.avatar_url || null,
              tokens: 0,
              total_games_played: 0,
              total_games_won: 0,
              win_rate: 0,
              created_at: authUser.created_at,
              updated_at: authUser.updated_at || authUser.created_at
            }
            setUser(user)
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
          const user: User = {
            id: authUser.id,
            username: authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'user',
            email: authUser.email || '',
            display_name: authUser.user_metadata?.display_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
            avatar_url: authUser.user_metadata?.avatar_url || null,
            tokens: 0,
            total_games_played: 0,
            total_games_won: 0,
            win_rate: 0,
            created_at: authUser.created_at,
            updated_at: authUser.updated_at || authUser.created_at
          }
          setUser(user)
        }
      }
    }
    
    loadUser()
    loadBars()
  }, [])

  const loadBars = async () => {
    try {
      // Load user's bars from database (including demo bars)
      const barsData = await getMyBars()
      console.log("Bars from database:", barsData)
      setBars(barsData)
    } catch (error) {
      console.error("Error loading bars:", error)
      setBars([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateBar = () => {
    router.push("/bars/create")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-white">Loading bars...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--chance-bg)] text-[var(--chance-fg)] relative chance-competitive-theme">
      <Header user={user} />
      
      {/* Subtle gradient overlay */}
      
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="chance-hero-title text-2xl sm:text-3xl">Bar Trivia</h1>
              <p className="text-gray-300 mt-1">
                {bars.length > 0 
                  ? "Manage your bar trivia venues" 
                  : "Join bar trivia games or manage venues"
                }
              </p>
            </div>
            {bars.length > 0 && (
              <Button
                onClick={handleCreateBar}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Bar
              </Button>
            )}
          </div>

          {/* Join Game Interface for All Users */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-12 text-center">
              <Trophy className="h-16 w-16 text-orange-400 mx-auto mb-4" />
              <h3 className="text-white text-xl font-medium mb-2">Join Bar Trivia</h3>
              <p className="text-gray-300 mb-6">
                Scan a QR code or enter a venue code to join a trivia game at a bar near you!
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => window.location.href = '/bar/join'}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  Join Trivia Game
                </Button>
                <p className="text-gray-400 text-sm">
                  Bar owner? <a href="/bars/create" className="text-orange-400 hover:text-orange-300 underline">Set up bar management</a>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Bar Management Interface (Only show if user has bars) */}
          {bars.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bars.map((bar) => (
                <Card key={bar.id} className="bg-gray-900 border-gray-800 hover:bg-gray-800 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-white text-lg">{bar.name}</CardTitle>
                        {bar.description && (
                          <p className="text-gray-300 text-sm mt-1 line-clamp-2">{bar.description}</p>
                        )}
                      </div>
                      <Badge 
                        variant="secondary" 
                        className="bg-green-500/20 text-green-400 border-green-500/30 ml-2"
                      >
                        Active
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Bar Details */}
                    <div className="space-y-2 text-gray-300 text-sm">
                      {bar.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          <span className="line-clamp-1">{bar.address}</span>
                        </div>
                      )}
                      {bar.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span>{bar.phone}</span>
                        </div>
                      )}
                      {bar.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-3 w-3" />
                          <a 
                            href={bar.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-orange-400 hover:text-orange-300 underline"
                          >
                            Visit Website
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Access Codes */}
                    <div className="space-y-2 pt-2 border-t border-gray-700">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">QR Code</span>
                        <span className="text-white font-mono">{bar.qr_code}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Venue Code</span>
                        <span className="text-white font-mono">{bar.venue_code}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                        onClick={() => router.push(`/bars/${bar.id}`)}
                      >
                        <QrCode className="h-3 w-3 mr-1" />
                        QR Codes
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                        onClick={() => router.push(`/bars/${bar.id}/dashboard`)}
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Manage
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
