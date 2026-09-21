"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Home, ArrowLeft } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 relative flex items-center justify-center p-4">
      {/* Subtle gradient overlay */}
      
      
      <Card className="w-full max-w-md bg-gray-900/80 border-gray-800 relative z-10">
        <CardHeader className="text-center">
          <div className="text-6xl font-bold text-orange-500 mb-4">404</div>
          <CardTitle className="text-white text-xl">Page Not Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-300 text-center">
            Sorry, we couldn't find the page you're looking for.
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild className="w-full bg-orange-500 hover:bg-orange-600 text-black font-semibold">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go to Home
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
