import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Zap, Trophy } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import type { Game } from "@/lib/supabase/client"

interface GameCardProps {
  game: Game
  activeMatches?: number
  onlineUsers?: number
}

const gameIcons = {
  "Math Blitz": "🧮",
  "Four in a Row": "🎮",
  "4 In a Row": "🔴",
  "Trivia Challenge": "🧠",
}

import { getGameDisplayName, getGameThumbnail } from "@/lib/games/game-visuals"

const gameColors = {
  "Math Blitz": {
    gradient: "from-blue-500 to-blue-600",
    hoverGradient: "from-blue-600 to-blue-700",
    border: "border-blue-500/20",
  },
  "Four in a Row": {
    gradient: "from-red-500 to-red-600",
    hoverGradient: "from-red-600 to-red-700",
    border: "border-red-500/20",
  },
  "4 In a Row": {
    gradient: "from-yellow-500 to-yellow-600",
    hoverGradient: "from-yellow-600 to-yellow-700",
    border: "border-yellow-500/20",
  },
  "Trivia Challenge": {
    gradient: "from-purple-500 to-purple-600",
    hoverGradient: "from-purple-600 to-purple-700",
    border: "border-purple-500/20",
  },
}

export default function GameCard({ game, activeMatches = 0, onlineUsers = 0 }: GameCardProps) {
  const colors = gameColors[game.name as keyof typeof gameColors] || gameColors["Math Blitz"]
  const displayName = getGameDisplayName(game.name)
  const thumbnailSrc = getGameThumbnail(game.name)

  return (
    <Card className="bg-gray-900/80 border-gray-800 hover:border-gray-700 transition-colors mx-1 sm:mx-0 group">
      <CardHeader className="text-center pb-3 sm:pb-4">
        <div className="flex justify-center mb-3 sm:mb-4">
          <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-lg overflow-hidden group-hover:scale-110 transition-transform duration-300">
            <Image
              src={thumbnailSrc}
              alt={displayName}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 128px, 160px"
            />
          </div>
        </div>
        <CardTitle className="text-white text-lg sm:text-xl mb-2">{displayName}</CardTitle>
        <CardDescription className="text-gray-400 text-xs sm:text-sm">{game.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Game Stats */}
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center text-green-400">
            <Users className="h-4 w-4 mr-1" />
            <span>{onlineUsers} online</span>
          </div>
          <div className="flex items-center text-gray-400">
            <Trophy className="h-4 w-4 mr-1" />
            <span>{activeMatches} active</span>
          </div>
        </div>

        {/* Bet Range */}
        <div className="bg-gray-800/30 p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-white/80 text-sm">Bet Range:</span>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="border-gray-600 text-gray-300">
                {game.min_bet} min
              </Badge>
              <Badge variant="outline" className="border-gray-600 text-gray-300">
                {game.max_bet} max
              </Badge>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            asChild
            size="sm"
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold"
          >
            <Link href={`/games/${game.id}`}>
              Create Match
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            <Link href={`/games/${game.id}`}>
              View Details
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
