"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/shared";
import { createBill } from "@/lib/actions/bills";

interface Category {
  id: string;
  name: string;
  color: string | null;
}

interface Vendor {
  id: string;
  name: string;
  categoryId: string;
  category: { id: string; name: string } | null;
}

export function NewBillForm({
  categories,
  vendors,
}: {
  categories: Category[];
  vendors: Vendor[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [categoryId, setCategoryId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [receivedDate, setReceivedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState("");
  const [recurring, setRecurring] = useState<string>("none");
  const [billedTo, setBilledTo] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState("");

  // Filter vendors by selected category
  const filteredVendors = useMemo(
    () => vendors.filter((v) => v.categoryId === categoryId),
    [vendors, categoryId]
  );

  const handleSubmit = async () => {
    if (!categoryId || !amount || !receivedDate) {
      toast.error("Please fill required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await createBill({
        categoryId,
        vendorId: vendorId || null,
        amount,
        note: note || null,
        imageUrl,
        receivedDate,
        dueDate: dueDate || null,
        isRecurring: recurring as any,
        billedTo: (billedTo as any) || null,
        invoiceNumber: invoiceNumber || null,
      });
      toast.success("Bill added successfully!");
      router.push("/bills");
    } catch (error) {
      toast.error("Failed to add bill");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link href="/bills">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="page-title">Add New Bill</h1>
            <p className="page-description">Record a new bill for your shop</p>
          </div>
        </div>
      </div>

      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Bill Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Category */}
          <div className="form-group">
            <Label>Category *</Label>
            <Select
              value={categoryId}
              onValueChange={(val) => {
                setCategoryId(val);
                setVendorId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: cat.color || "#6366f1" }}
                      />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vendor */}
          {categoryId && filteredVendors.length > 0 && (
            <div className="form-group">
              <Label>Vendor</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {filteredVendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Amount */}
          <div className="form-group">
            <Label>Amount (₹) *</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-lg font-semibold"
            />
          </div>

          {/* Invoice Number */}
          <div className="form-group">
            <Label>Invoice Number</Label>
            <Input
              placeholder="e.g., INV-2024-001 (optional)"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
          </div>

          {/* Billed To */}
          <div className="form-group">
            <Label>Billed To</Label>
            <Select value={billedTo} onValueChange={setBilledTo}>
              <SelectTrigger>
                <SelectValue placeholder="Select subsidiary" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anchal_sweets">Anchal Sweets</SelectItem>
                <SelectItem value="anchal_caterers">Anchal Caterers</SelectItem>
                <SelectItem value="anchal_caterers_original">Anchal Caterers (Original)</SelectItem>
              </SelectContent>
            </Select>
          </div>


          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <Label>Received Date *</Label>
              <Input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Recurring */}
          <div className="form-group">
            <Label>Recurring</Label>
            <Select value={recurring} onValueChange={setRecurring}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">One-time</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Note */}
          <div className="form-group">
            <Label>Note</Label>
            <Textarea
              placeholder="Optional note about this bill..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>

          {/* Image */}
          <div className="form-group">
            <Label>Bill Image</Label>
            <ImageUpload value={imageUrl} onChange={setImageUrl} />
            <p className="text-[10px] text-muted-foreground">
              Images are auto-compressed to save storage space
            </p>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleSubmit}
              disabled={isSubmitting || !categoryId || !amount || !receivedDate}
            >
              <Plus className="h-4 w-4" />
              {isSubmitting ? "Adding..." : "Add Bill"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
