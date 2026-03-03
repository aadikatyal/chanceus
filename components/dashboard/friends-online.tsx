"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ChevronDown, Users, Circle, UserPlus, Search, CheckCircle, XCircle, Loader2, Gamepad2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { searchUsers, sendFriendRequest, getPendingRequests, getSentRequests, acceptFriendRequest, rejectFriendRequest, FriendRequest } from '@/lib/friends-actions'
import { useToast } from '@/hooks/use-toast'
import { createFriendMatch } from '@/lib/game-actions'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface Friend {
  id: string
  display_name: string
  username: string
  is_online: boolean
  last_seen: string
}

type TabType = 'friends' | 'add' | 'requests'

export default function FriendsOnline() {
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('friends')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([])
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(true)
  const [showPlayFriendDialog, setShowPlayFriendDialog] = useState(false)
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null)
  const [creatingMatch, setCreatingMatch] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        // Get current user first
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        
        if (!currentUser) {
          setFriends([])
          setLoading(false)
          return
        }

        // Fetch actual friends from friends table
        const { data: friendsData, error } = await supabase
          .from('friends')
          .select(`
            id,
            user_id,
            friend_id,
            status,
            user:users!friends_user_id_fkey(id, display_name, username, is_online, last_seen),
            friend:users!friends_friend_id_fkey(id, display_name, username, is_online, last_seen)
          `)
          .eq('status', 'accepted')
          .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)

        if (error) {
          console.error('Error fetching friends:', error)
          setFriends([])
        } else {
          // Map friends data to extract the other user's info
          const mappedFriends = (friendsData || []).map((friendship: any) => {
            const otherUser = friendship.user_id === currentUser.id ? friendship.friend : friendship.user
            return {
              id: otherUser.id,
              display_name: otherUser.display_name || otherUser.username,
              username: otherUser.username,
              is_online: otherUser.is_online || false,
              last_seen: otherUser.last_seen || new Date().toISOString()
            }
          })
          setFriends(mappedFriends)
        }
      } catch (error) {
        console.error('Error fetching friends:', error)
        setFriends([])
      } finally {
        setLoading(false)
      }
    }

    fetchFriends()
    
    // Refresh friends list periodically
    const interval = setInterval(fetchFriends, 30000) // Every 30 seconds
    
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (open && (activeTab === 'add' || activeTab === 'requests')) {
      loadPendingRequests()
    }
  }, [open, activeTab])

  const loadPendingRequests = async () => {
    setIsLoadingRequests(true)
    
    const [pendingResult, sentResult] = await Promise.all([
      getPendingRequests(),
      getSentRequests()
    ])
    
    if (!pendingResult.error && pendingResult.data) {
      setPendingRequests(pendingResult.data)
    }
    
    if (!sentResult.error && sentResult.data) {
      setSentRequests(sentResult.data)
    }
    
    setIsLoadingRequests(false)
  }

  const handleSearch = async () => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      toast({
        title: "Search term too short",
        description: "Please enter at least 2 characters to search",
        variant: "destructive",
      })
      return
    }

    setIsSearching(true)
    const { data, error } = await searchUsers(searchTerm.trim())

    if (error) {
      toast({
        title: "Search failed",
        description: error.message || "Could not search for users",
        variant: "destructive",
      })
      setSearchResults([])
    } else {
      setSearchResults(data || [])
    }

    setIsSearching(false)
  }

  const handleSendRequest = async (userId: string, username: string) => {
    const result = await sendFriendRequest(userId)

    if (result.success) {
      toast({
        title: "Friend request sent!",
        description: `Friend request sent to ${username}`,
      })
      loadPendingRequests()
      setSearchResults([])
      setSearchTerm('')
    } else {
      toast({
        title: "Failed to send request",
        description: result.error || "Could not send friend request",
        variant: "destructive",
      })
    }
  }

  const handleAcceptRequest = async (requestId: string) => {
    const { success, error } = await acceptFriendRequest(requestId)

    if (success) {
      toast({
        title: "Friend request accepted!",
        description: "You are now friends",
      })
      loadPendingRequests()
      // Refresh friends list
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        const { data: friendsData } = await supabase
          .from('friends')
          .select(`
            id,
            user_id,
            friend_id,
            status,
            user:users!friends_user_id_fkey(id, display_name, username, is_online, last_seen),
            friend:users!friends_friend_id_fkey(id, display_name, username, is_online, last_seen)
          `)
          .eq('status', 'accepted')
          .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)
        
        if (friendsData) {
          const mappedFriends = friendsData.map((friendship: any) => {
            const otherUser = friendship.user_id === currentUser.id ? friendship.friend : friendship.user
            return {
              id: otherUser.id,
              display_name: otherUser.display_name || otherUser.username,
              username: otherUser.username,
              is_online: otherUser.is_online || false,
              last_seen: otherUser.last_seen || new Date().toISOString()
            }
          })
          setFriends(mappedFriends)
        }
      }
    } else {
      toast({
        title: "Failed to accept request",
        description: error || "Could not accept friend request",
        variant: "destructive",
      })
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    const { success, error } = await rejectFriendRequest(requestId)

    if (success) {
      toast({
        title: "Friend request rejected",
      })
      loadPendingRequests()
    } else {
      toast({
        title: "Failed to reject request",
        description: error || "Could not reject friend request",
        variant: "destructive",
      })
    }
  }

  const handlePlayFriend = async (friend: Friend, gameId: string, betAmount: number) => {
    setCreatingMatch(true)
    try {
      const result = await createFriendMatch(gameId, friend.id, betAmount)

      if (result.error) {
        toast({
          title: "Failed to create match",
          description: result.error,
          variant: "destructive",
        })
      } else if (result.matchId) {
        toast({
          title: "Match request sent!",
          description: result.message || "Your friend will be notified to accept the match",
        })
        setShowPlayFriendDialog(false)
        router.push(`/games/match/${result.matchId}`)
      }
    } catch (error) {
      console.error('Error creating friend match:', error)
      toast({
        title: "Error",
        description: "Failed to create match with friend",
        variant: "destructive",
      })
    } finally {
      setCreatingMatch(false)
    }
  }

  const onlineFriends = friends.filter(friend => friend.is_online)
  const onlineCount = onlineFriends.length

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-gray-400">
        <Users className="h-4 w-4" />
        <span className="text-sm">Loading...</span>
      </div>
    )
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center space-x-2 text-gray-300 hover:text-white hover:bg-gray-800/50 px-3 py-2 rounded-lg transition-colors"
        >
          <Users className="h-4 w-4" />
          <span className="text-sm font-medium">
            {onlineCount > 0 ? `${onlineCount} online` : 'No friends online'}
          </span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-80 bg-gray-900 border-gray-700 text-white"
      >
        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'friends'
                ? 'text-white border-b-2 border-orange-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'add'
                ? 'text-white border-b-2 border-orange-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Add Friends
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors relative ${
              activeTab === 'requests'
                ? 'text-white border-b-2 border-orange-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Requests
            {pendingRequests.length > 0 && (
              <span className="absolute top-1 right-2 h-4 w-4 bg-orange-500 rounded-full text-xs flex items-center justify-center text-black font-bold">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>
        
        {/* Content */}
        <div className="max-h-96 overflow-y-auto">
          {activeTab === 'friends' && (
            <>
        {friends.length === 0 ? (
          <div className="px-3 py-4 text-center text-gray-400 text-sm">
            No friends found
          </div>
        ) : (
                <div>
            {friends.map((friend) => (
              <div key={friend.id} className="px-3 py-2 hover:bg-gray-800">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-black font-bold text-sm">
                      {friend.display_name.charAt(0).toUpperCase()}
                    </div>
                    <Circle 
                      className={`absolute -bottom-1 -right-1 h-3 w-3 ${
                        friend.is_online 
                          ? 'text-green-500 fill-green-500' 
                          : 'text-gray-500 fill-gray-500'
                      }`} 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {friend.display_name}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      @{friend.username}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-xs text-gray-500">
                      {friend.is_online ? 'Online' : 'Offline'}
                    </div>
                    <Dialog open={showPlayFriendDialog && selectedFriend?.id === friend.id} onOpenChange={(open) => {
                      setShowPlayFriendDialog(open)
                      if (!open) setSelectedFriend(null)
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedFriend(friend)
                            setShowPlayFriendDialog(true)
                          }}
                          className="h-7 px-2 bg-orange-500 hover:bg-orange-600 text-white text-xs"
                        >
                          <Gamepad2 className="h-3 w-3 mr-1" />
                          Play
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-gray-900 border-gray-700 text-white">
                        <DialogHeader>
                          <DialogTitle className="text-white">Play with {friend.display_name}</DialogTitle>
                          <DialogDescription className="text-gray-400">
                            Select a game to challenge {friend.display_name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2 mt-4">
                          <Button
                            onClick={() => handlePlayFriend(friend, 'd0c5fda9-ec91-46b4-be62-cba48b398168', 100)}
                            disabled={creatingMatch}
                            className="w-full bg-cyan-500 hover:bg-cyan-600 text-black"
                          >
                            Math Blitz (100 tokens)
                          </Button>
                          <Button
                            onClick={() => handlePlayFriend(friend, '69bf26d2-110b-40d9-b20a-d5cfab14d133', 100)}
                            disabled={creatingMatch}
                            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
                          >
                            Four in a Row (100 tokens)
                          </Button>
                          <Button
                            onClick={() => handlePlayFriend(friend, 'e03ee060-b913-4795-9149-54660e2e2eac', 100)}
                            disabled={creatingMatch}
                            className="w-full bg-purple-500 hover:bg-purple-600 text-black"
                          >
                            Trivia Challenge (100 tokens)
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
            </>
          )}

          {activeTab === 'add' && (
            <div className="p-3 space-y-3">
              {/* Search Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Search by username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="bg-gray-700/50 border-gray-600 text-white text-sm h-8 placeholder:text-gray-500"
                />
                <Button onClick={handleSearch} disabled={isSearching} size="sm" className="h-8 px-3">
                  {isSearching ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Search className="h-3 w-3" />
                  )}
                </Button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg border border-gray-600/30 hover:bg-gray-700/70 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center ring-2 ring-orange-500/30">
                          <span className="text-orange-500 font-semibold text-xs">
                            {user.display_name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium text-sm">{user.display_name || user.username}</p>
                          <p className="text-xs text-gray-400">@{user.username}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSendRequest(user.id, user.display_name || user.username)}
                        className="h-7 px-2 bg-orange-500 hover:bg-orange-600 text-white text-xs"
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {searchTerm && searchResults.length === 0 && !isSearching && (
                <div className="text-center py-4 text-gray-400 text-sm">
                  No results found
                </div>
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="p-3 space-y-3">
              {isLoadingRequests ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                </div>
              ) : (
                <>
                  {/* Pending Requests */}
                  {pendingRequests.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-2 font-medium">Pending Requests ({pendingRequests.length})</p>
                      <div className="space-y-2">
                        {pendingRequests.map((request) => (
                          <div key={request.id} className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg border border-gray-600/30">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center ring-2 ring-orange-500/30">
                                <span className="text-orange-500 font-semibold text-xs">
                                  {request.user?.display_name?.[0]?.toUpperCase() || request.user?.username?.[0]?.toUpperCase() || '?'}
                                </span>
                              </div>
                              <div>
                                <p className="text-white font-medium text-sm">{request.user?.display_name || request.user?.username}</p>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleAcceptRequest(request.id)}
                                className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectRequest(request.id)}
                                className="h-7 w-7 p-0"
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sent Requests */}
                  {sentRequests.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-2 font-medium">Sent Requests ({sentRequests.length})</p>
                      <div className="space-y-2">
                        {sentRequests.map((request) => (
                          <div key={request.id} className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg border border-gray-600/30">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center ring-2 ring-orange-500/30">
                                <span className="text-orange-500 font-semibold text-xs">
                                  {request.friend?.display_name?.[0]?.toUpperCase() || request.friend?.username?.[0]?.toUpperCase() || '?'}
                                </span>
                              </div>
                              <div>
                                <p className="text-white font-medium text-sm">{request.friend?.display_name || request.friend?.username}</p>
                                <p className="text-xs text-orange-500">Pending...</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pendingRequests.length === 0 && sentRequests.length === 0 && (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      No friend requests
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
