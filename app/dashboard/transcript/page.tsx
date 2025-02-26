"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";

interface Transcript {
  _id: string;
  phone_number: string;
  conversation?: Array<{ RME: string } | string>; // Make conversation optional
}

export default function TranscriptPage() {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [openTranscripts, setOpenTranscripts] = useState<string[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [isGeneratingResume, setIsGeneratingResume] = useState<string | null>(
    null
  );

  const fetchTranscripts = async (page: number) => {
    try {
      const response = await fetch(`/api/transcripts?page=${page}&limit=5`);
      const data = await response.json();

      if (Array.isArray(data.transcripts)) {
        setTranscripts(data.transcripts);
        setPagination(data.pagination);
      } else {
        setTranscripts([]);
      }
    } catch (error) {
      console.error("Error fetching transcripts:", error);
      setTranscripts([]);
    }
  };

  useEffect(() => {
    fetchTranscripts(pagination.page);
  }, [pagination.page]);

  const toggleTranscript = (id: string) => {
    setOpenTranscripts((prev) =>
      prev.includes(id)
        ? prev.filter((transcriptId) => transcriptId !== id)
        : [...prev, id]
    );
  };

  const handleGenerateResume = async (transcript: Transcript) => {
    setIsGeneratingResume(transcript._id);
    try {
      const response = await fetch("/api/generate-resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phoneNumber: transcript.phone_number }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate resume");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `${transcript.phone_number}_resume.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating resume:", error);
      alert("Failed to generate resume. Please try again.");
    } finally {
      setIsGeneratingResume(null);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Transcripts</h1>
      {Array.isArray(transcripts) && transcripts.length > 0 ? (
        transcripts.map((transcript) => (
          <Card key={transcript._id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{transcript.phone_number || "Unknown"}</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateResume(transcript)}
                  disabled={isGeneratingResume === transcript._id}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {isGeneratingResume === transcript._id
                    ? "Generating..."
                    : "Generate Resume"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Collapsible
                open={openTranscripts.includes(transcript._id)}
                onOpenChange={() => toggleTranscript(transcript._id)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center w-full justify-between"
                  >
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
                    {/** FIX: Ensure conversation is defined */}
                    {transcript.transcript &&
                    transcript.transcript.length > 0 ? (
                      transcript.transcript.map((entry, index) => (
                        <p key={index}>
                          <strong>{entry.role}:</strong> {entry.text}
                        </p>
                      ))
                    ) : (
                      <p>No transcript available</p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        ))
      ) : (
        <p>No transcripts available</p>
      )}

      {/* Pagination Controls */}
      <div className="mt-4 flex justify-center gap-4">
        <Button
          onClick={() =>
            setPagination((prev) => ({
              ...prev,
              page: Math.max(1, prev.page - 1),
            }))
          }
          disabled={pagination.page <= 1}
        >
          Previous
        </Button>
        <span>
          Page {pagination.page} of {pagination.totalPages}
        </span>
        <Button
          onClick={() =>
            setPagination((prev) => ({
              ...prev,
              page: Math.min(prev.totalPages, prev.page + 1),
            }))
          }
          disabled={pagination.page >= pagination.totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
