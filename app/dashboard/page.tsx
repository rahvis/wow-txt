"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const defaultContacts = [
  { name: "John Smith", mobile: "+1234567890", job: "Software Engineer" },
  { name: "Sarah Wilson", mobile: "+9876543210", job: "Product Manager" },
  { name: "Michael Chen", mobile: "+1122334455", job: "UX Designer" },
];

export default function Call() {
  const [number, setNumber] = useState("");
  const [callStatus, setCallStatus] = useState("");

  const handleCall = () => {
    if (!number) return;
    setCallStatus(`Calling ${number}...`);
    // Simulate a call
    setTimeout(() => {
      setCallStatus(`Call to ${number} ended`);
    }, 3000);
  };

  const handleContactClick = (mobile: string) => {
    setNumber(mobile);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Make a Call</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex space-x-2">
            <Input
              type="tel"
              placeholder="Enter phone number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
            <Button onClick={handleCall}>Call</Button>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Default Numbers</h3>
            <div className="space-y-2">
              {defaultContacts.map((contact) => (
                <Card
                  key={contact.mobile}
                  className="p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleContactClick(contact.mobile)}
                >
                  <div className="space-y-1">
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {contact.mobile}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {contact.job}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
          {callStatus && (
            <div className="mt-4">
              <p className="text-sm font-medium">{callStatus}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
