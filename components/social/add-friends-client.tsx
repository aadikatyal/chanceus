"use client"

import { useState, useEffect } from "react"
import {
  searchUsers,
  sendFriendRequest,
  getPendingRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  type FriendRequest,
} from "@/lib/friends-actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import ChancePlayerAvatar from "@/components/dashboard/chance-player-avatar"
import { Search, UserPlus, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function AddFriendsClient() {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadPendingRequests()
  }, [])

  const loadPendingRequests = async () => {
    setIsLoadingRequests(true)
    const { data, error } = await getPendingRequests()
    if (!error && data) setPendingRequests(data)
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
    const { success, error } = await sendFriendRequest(userId)
    if (success) {
      toast({ title: "Friend request sent!", description: `Sent to ${username}` })
      loadPendingRequests()
    } else {
      toast({
        title: "Failed to send request",
        description: error || "Could not send friend request",
        variant: "destructive",
      })
    }
  }

  const handleAcceptRequest = async (requestId: string) => {
    const { success, error } = await acceptFriendRequest(requestId)
    if (success) {
      toast({ title: "Friend request accepted!" })
      loadPendingRequests()
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
      toast({ title: "Friend request rejected" })
      loadPendingRequests()
    } else {
      toast({
        title: "Failed to reject request",
        description: error || "Could not reject friend request",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      {isLoadingRequests ? (
        <section className="chance-premium-card flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-[var(--chance-brand)]" aria-label="Loading requests" />
        </section>
      ) : pendingRequests.length > 0 ? (
        <section className="chance-premium-card p-4 sm:p-6">
          <h2 className="chance-section-title">Pending requests</h2>
          <p className="chance-text-caption mb-4">
            {pendingRequests.length} pending request{pendingRequests.length > 1 ? "s" : ""}
          </p>
          <ul className="space-y-2">
            {pendingRequests.map((request) => (
              <li
                key={request.id}
                className="flex flex-col gap-3 rounded-lg border border-[var(--chance-border)] bg-[var(--chance-surface-inset)] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <ChancePlayerAvatar
                    name={request.user?.display_name || request.user?.username || "?"}
                    className="size-10 text-sm"
                  />
                  <div>
                    <p className="text-sm font-medium">{request.user?.display_name || request.user?.username}</p>
                    <p className="chance-text-caption">@{request.user?.username}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleAcceptRequest(request.id)} className="chance-hero-cta-primary gap-2">
                    <CheckCircle className="size-4" aria-hidden />
                    Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleRejectRequest(request.id)} className="chance-hero-cta-ghost gap-2">
                    <XCircle className="size-4" aria-hidden />
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="chance-premium-card p-4 sm:p-6">
        <h2 className="chance-section-title">Search users</h2>
        <p className="chance-text-caption mb-4">Find friends by username or display name</p>
        <div className="mb-6 flex gap-2">
          <Input
            placeholder="Search by username or display name…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="chance-input flex-1"
          />
          <Button onClick={handleSearch} disabled={isSearching} className="chance-hero-cta-primary shrink-0 px-3">
            {isSearching ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Search className="size-4" aria-hidden />}
          </Button>
        </div>

        {searchResults.length > 0 ? (
          <ul className="space-y-2">
            {searchResults.map((user) => (
              <li
                key={user.id}
                className="flex flex-col gap-3 rounded-lg border border-[var(--chance-border)] bg-[var(--chance-surface-inset)] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <ChancePlayerAvatar name={user.display_name || user.username} className="size-10 text-sm" />
                  <div>
                    <p className="text-sm font-medium">{user.display_name || user.username}</p>
                    <p className="chance-text-caption">@{user.username}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSendRequest(user.id, user.display_name || user.username)}
                  className="chance-hero-cta-ghost gap-2"
                >
                  <UserPlus className="size-4" aria-hidden />
                  Add friend
                </Button>
              </li>
            ))}
          </ul>
        ) : searchTerm && !isSearching ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium">No results found</p>
            <p className="chance-text-caption mt-1">Try a different search term</p>
          </div>
        ) : null}
      </section>
    </div>
  )
}
