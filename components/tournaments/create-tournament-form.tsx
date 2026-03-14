"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createTournament, registerForTournament } from "@/lib/tournament-actions"
import { toast } from "@/hooks/use-toast"
import { Trophy, Coins, Users } from "lucide-react"

interface CreateTournamentFormProps {
  games: Array<{
    id: string
    name: string
    description: string | null
    min_bet: number
    max_bet: number
  }>
}

const TOURNAMENT_SIZES = [4, 8, 16, 32, 64, 128, 256, 512] as const

export default function CreateTournamentForm({ games }: CreateTournamentFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    gameId: "",
    name: "",
    description: "",
    entryFee: "100",
    maxParticipants: "8",
    joinAsPlayer: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const result = await createTournament(
        formData.gameId,
        formData.name,
        formData.description || null,
        parseInt(formData.entryFee),
        parseInt(formData.maxParticipants)
      )

      if (result) {
        if (formData.joinAsPlayer) {
          const regResult = await registerForTournament(result.id)
          if (regResult.error) {
            toast({
              title: "Tournament created",
              description: regResult.error,
              variant: "destructive",
            })
          } else {
            toast({
              title: "Tournament created!",
              description: "You're registered and ready to play.",
            })
          }
        } else {
          toast({
            title: "Tournament created!",
            description: "You can start the tournament when ready (spectator mode).",
          })
        }
        router.push(`/tournaments/${result.id}`)
        router.refresh()
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create tournament",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="bg-gray-900/80 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Trophy className="h-5 w-5 text-orange-500" />
          Tournament Details
        </CardTitle>
        <CardDescription>Configure your tournament settings</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="gameId" className="text-white">
              Game
            </Label>
            <Select
              value={formData.gameId}
              onValueChange={(value) => setFormData({ ...formData, gameId: value })}
              required
            >
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Select a game" />
              </SelectTrigger>
              <SelectContent>
                {games.map((game) => (
                  <SelectItem key={game.id} value={game.id} className="text-white">
                    {game.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-white">
              Tournament Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Spring Championship 2024"
              className="bg-gray-800 border-gray-700 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-white">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your tournament..."
              className="bg-gray-800 border-gray-700 text-white"
              rows={3}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="entryFee" className="text-white flex items-center gap-2">
                <Coins className="h-4 w-4 text-yellow-400" />
                Entry Fee (tokens)
              </Label>
              <Input
                id="entryFee"
                type="number"
                value={formData.entryFee}
                onChange={(e) => setFormData({ ...formData, entryFee: e.target.value })}
                min="1"
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
              <p className="text-xs text-gray-400">
                Entry fees contribute to the prize pool
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxParticipants" className="text-white flex items-center gap-2">
                <Users className="h-4 w-4" />
                Max Participants
              </Label>
              <Select
                value={formData.maxParticipants}
                onValueChange={(value) => setFormData({ ...formData, maxParticipants: value })}
                required
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {TOURNAMENT_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)} className="text-white">
                      {size} players
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">
                Power of 2 only (no byes). Seed bots to fill: node scripts/seed-tournament-players.mjs &lt;id&gt; {formData.maxParticipants}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="joinAsPlayer"
              checked={formData.joinAsPlayer}
              onChange={(e) =>
                setFormData({ ...formData, joinAsPlayer: e.target.checked })
              }
              className="rounded border-gray-600 bg-gray-800 text-orange-500 focus:ring-orange-500"
            />
            <Label htmlFor="joinAsPlayer" className="text-white cursor-pointer">
              Join as a player (uncheck to spectate only)
            </Label>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-blue-300">
              <strong>Prize Pool:</strong> {formData.entryFee && formData.maxParticipants
                ? (parseInt(formData.entryFee) * parseInt(formData.maxParticipants)).toLocaleString()
                : "0"}{" "}
              tokens
            </p>
            <p className="text-xs text-blue-400/70 mt-1">
              Prize pool = Entry fee × Max participants
            </p>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !formData.gameId || !formData.name}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-black font-semibold"
          >
            {isSubmitting ? "Creating..." : "Create Tournament"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

