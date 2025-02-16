"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, FileText } from "lucide-react"

interface Transcript {
  _id: string
  conversation_id: string
  phone_number: string
  conversation: Array<{ RME: string } | string>
  name?: string
  date?: string
}

export default function Transcript() {
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [openTranscripts, setOpenTranscripts] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGeneratingResume, setIsGeneratingResume] = useState(false)

  useEffect(() => {
    const fetchTranscripts = async () => {
      try {
        const response = await fetch("/api/transcripts")
        if (!response.ok) {
          throw new Error("Failed to fetch transcripts")
        }
        const data = await response.json()
        setTranscripts(data)
      } catch (err) {
        setError("Failed to load transcripts. Please try again later.")
        console.error("Error fetching transcripts:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTranscripts()
  }, [])

  const toggleTranscript = (id: string) => {
    setOpenTranscripts((prev) =>
      prev.includes(id) ? prev.filter((transcriptId) => transcriptId !== id) : [...prev, id],
    )
  }

  const handleGenerateResume = async (transcript: Transcript) => {
    setIsGeneratingResume(true)
    try {
      const response = await fetch("/api/generate-resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phoneNumber: transcript.phone_number }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate resume")
      }

      const resumeContent = await response.text()

      // Create a Blob with the resume content
      const blob = new Blob([resumeContent], { type: "text/plain" })
      const url = window.URL.createObjectURL(blob)

      // Create a link and trigger the download
      const a = document.createElement("a")
      a.style.display = "none"
      a.href = url
      a.download = `${transcript.phone_number}_resume.txt`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error generating resume:", error)
      alert("Failed to generate resume. Please try again.")
    } finally {
      setIsGeneratingResume(false)
    }
  }

  const renderConversationLine = (line: { RME: string } | string) => {
    if (typeof line === "string") {
      return <p>{line}</p>
    } else if (typeof line === "object" && "RME" in line) {
      return <p>{line.RME}</p>
    }
    return null
  }

  if (isLoading) {
    return <div>Loading transcripts...</div>
  }

  if (error) {
    return <div>{error}</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversation History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transcripts.map((transcript) => (
            <Card key={transcript._id}>
              <CardHeader className="relative">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{transcript.phone_number}</CardTitle>
                    <p className="text-sm text-muted-foreground">Conversation ID: {transcript.conversation_id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateResume(transcript)}
                      disabled={isGeneratingResume}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      {isGeneratingResume ? "Generating..." : "Generate Resume"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Collapsible
                  open={openTranscripts.includes(transcript._id)}
                  onOpenChange={() => toggleTranscript(transcript._id)}
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="flex items-center w-full justify-between">
                      <span>View Transcript</span>
                      {openTranscripts.includes(transcript._id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <div className="whitespace-pre-line text-sm">
                      {transcript.conversation.map((line, index) => (
                        <div key={index}>{renderConversationLine(line)}</div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

