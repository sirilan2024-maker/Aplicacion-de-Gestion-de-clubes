import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Users } from "lucide-react"

export default function Loading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-72 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded-md animate-pulse" />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="h-10 flex-1 bg-gray-100 rounded-md animate-pulse" />
        <div className="h-10 w-24 bg-gray-100 rounded-md animate-pulse" />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="border-none shadow-sm overflow-hidden">
            <div className="h-2 w-full bg-gray-200 animate-pulse" />
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50 my-4">
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                  <div className="h-6 w-8 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                  <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <div className="h-8 flex-1 bg-gray-100 rounded animate-pulse" />
                <div className="h-8 w-8 bg-gray-100 rounded animate-pulse" />
                <div className="h-8 w-8 bg-gray-100 rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
