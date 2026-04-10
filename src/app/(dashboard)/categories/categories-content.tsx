"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Plus,
  FolderOpen,
  MoreVertical,
  Pencil,
  Trash2,
  Users,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { EmptyState, ConfirmDialog } from "@/components/shared";
import { formatCurrency, CATEGORY_COLORS, CATEGORY_ICONS } from "@/lib/utils";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/actions/categories";

interface CategoryWithStats {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  totalBills: number;
  totalAmount: number;
  unpaidAmount: number;
  paidAmount: number;
  vendorCount: number;
}

export function CategoriesContent({
  initialCategories,
}: {
  initialCategories: CategoryWithStats[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithStats | null>(null);
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState<string>(CATEGORY_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreateDialog = () => {
    setEditingCategory(null);
    setFormName("");
    setFormColor(CATEGORY_COLORS[0]);
    setDialogOpen(true);
  };

  const openEditDialog = (cat: CategoryWithStats) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormColor(cat.color || (CATEGORY_COLORS[0] as string));
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) return;
    setIsSubmitting(true);

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: formName.trim(),
          color: formColor,
        });
        toast.success("Category updated");
      } else {
        await createCategory({
          name: formName.trim(),
          color: formColor,
        });
        toast.success("Category created");
      }
      setDialogOpen(false);
      // Reload page to get fresh data
      window.location.reload();
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      toast.success("Category deleted");
    } catch (error) {
      toast.error("Failed to delete category");
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-description">
            Organize your bills by raw material type
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No categories yet"
          description="Create categories like Dairy, Cold Drinks, Vegetables, Dry Fruits to organize your bills."
          actionLabel="Create First Category"
          onAction={openCreateDialog}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat, i) => (
            <div
              key={cat.id}
              className="group animate-fade-in rounded-xl border bg-card transition-all hover:shadow-lg"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              {/* Color bar */}
              <div
                className="h-1.5 rounded-t-xl"
                style={{ backgroundColor: cat.color || "#6366f1" }}
              />

              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{
                        backgroundColor: `${cat.color || "#6366f1"}15`,
                        color: cat.color || "#6366f1",
                      }}
                    >
                      <FolderOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{cat.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {cat.vendorCount} vendor{cat.vendorCount !== 1 ? "s" : ""} •{" "}
                        {cat.totalBills} bill{cat.totalBills !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(cat)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(cat.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Stats */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-lg font-bold tabular-nums">
                      {formatCurrency(cat.totalAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-amber-600">Unpaid</p>
                    <p className="text-lg font-bold tabular-nums text-amber-600">
                      {formatCurrency(cat.unpaidAmount)}
                    </p>
                  </div>
                </div>

                {/* Progress */}
                <div className="mt-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{
                        width: `${
                          cat.totalAmount > 0
                            ? (cat.paidAmount / cat.totalAmount) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {cat.totalAmount > 0
                      ? Math.round((cat.paidAmount / cat.totalAmount) * 100)
                      : 0}
                    % paid
                  </p>
                </div>

                {/* Action */}
                <Link href={`/categories/${cat.id}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 w-full gap-1 text-xs"
                  >
                    View Bills <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "New Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="form-group">
              <Label>Category Name</Label>
              <Input
                placeholder="e.g., Dairy, Cold Drinks, Vegetables..."
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>
            <div className="form-group">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormColor(color as string)}
                    className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor:
                        formColor === color ? "hsl(var(--foreground))" : "transparent",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !formName.trim()}>
              {isSubmitting
                ? "Saving..."
                : editingCategory
                ? "Update"
                : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
