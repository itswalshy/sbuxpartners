"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2 } from "lucide-react"
import type { Partner } from "@/lib/types"

interface ManualEntryFormProps {
  onSubmit: (partners: Partner[], totalTips: number) => void
}

export default function ManualEntryForm({ onSubmit }: ManualEntryFormProps) {
  const [partners, setPartners] = useState<Partner[]>([
    { name: "", hours: 0 },
    { name: "", hours: 0 },
  ])
  const [totalTips, setTotalTips] = useState<number>(0)

  const addPartner = () => {
    setPartners([...partners, { name: "", hours: 0 }])
  }

  const removePartner = (index: number) => {
    if (partners.length > 1) {
      setPartners(partners.filter((_, i) => i !== index))
    }
  }

  const updatePartner = (index: number, field: keyof Partner, value: string | number) => {
    const updatedPartners = [...partners]
    if (field === "hours") {
      updatedPartners[index][field] = typeof value === "string" ? Number.parseFloat(value) || 0 : value
    } else {
      updatedPartners[index][field] = value as string
    }
    setPartners(updatedPartners)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    const validPartners = partners.filter((p) => p.name.trim() !== "" && p.hours > 0)

    if (validPartners.length === 0) {
      alert("Please add at least one partner with hours worked")
      return
    }

    if (totalTips <= 0) {
      alert("Total tips must be greater than zero")
      return
    }

    onSubmit(validPartners, totalTips)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="totalTips">Total Tips ($)</Label>
        <Input
          id="totalTips"
          type="number"
          step="0.01"
          min="0"
          value={totalTips || ""}
          onChange={(e) => setTotalTips(Number.parseFloat(e.target.value) || 0)}
          placeholder="Enter total tips amount"
          className="mt-1"
          required
        />
      </div>

      <div className="space-y-4">
        <Label>Partner Information</Label>

        {partners.map((partner, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={partner.name}
              onChange={(e) => updatePartner(index, "name", e.target.value)}
              placeholder="Partner Name"
              className="flex-1"
              required
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              value={partner.hours || ""}
              onChange={(e) => updatePartner(index, "hours", e.target.value)}
              placeholder="Hours"
              className="w-24"
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removePartner(index)}
              disabled={partners.length <= 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button type="button" variant="outline" onClick={addPartner} className="w-full">
          Add Partner
        </Button>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          Total Hours: {partners.reduce((sum, p) => sum + p.hours, 0).toFixed(2)}
        </div>
        <Button type="submit">Calculate Tips</Button>
      </div>
    </form>
  )
}

