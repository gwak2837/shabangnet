'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type Manufacturer } from '@/lib/mock-data';
import { Building2, Loader2 } from 'lucide-react';

interface ManufacturerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manufacturer: Manufacturer | null;
  onSave: (data: Partial<Manufacturer>) => void;
}

export function ManufacturerModal({ open, onOpenChange, manufacturer, onSave }: ManufacturerModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contactName: '',
    email: '',
    ccEmail: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEdit = !!manufacturer;

  useEffect(() => {
    if (manufacturer) {
      setFormData({
        name: manufacturer.name,
        contactName: manufacturer.contactName,
        email: manufacturer.email,
        ccEmail: manufacturer.ccEmail || '',
        phone: manufacturer.phone,
      });
    } else {
      setFormData({
        name: '',
        contactName: '',
        email: '',
        ccEmail: '',
        phone: '',
      });
    }
    setErrors({});
  }, [manufacturer, open]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '제조사명을 입력하세요';
    }
    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력하세요';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력하세요';
    }
    if (formData.ccEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ccEmail)) {
      newErrors.ccEmail = '올바른 이메일 형식을 입력하세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSaving(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    onSave({
      ...formData,
      ccEmail: formData.ccEmail || undefined,
    });

    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <Building2 className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <DialogTitle>{isEdit ? '제조사 수정' : '제조사 추가'}</DialogTitle>
              <DialogDescription>
                {isEdit ? '제조사 정보를 수정합니다.' : '새로운 제조사를 등록합니다.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              제조사명 <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="예: 농심식품"
              className={errors.name ? 'border-rose-500' : ''}
            />
            {errors.name && <p className="text-xs text-rose-500">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactName">담당자명</Label>
            <Input
              id="contactName"
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              placeholder="예: 김영희"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              이메일 <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="예: contact@company.com"
              className={errors.email ? 'border-rose-500' : ''}
            />
            {errors.email && <p className="text-xs text-rose-500">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ccEmail">참조 이메일 (CC)</Label>
            <Input
              id="ccEmail"
              type="email"
              value={formData.ccEmail}
              onChange={(e) => setFormData({ ...formData, ccEmail: e.target.value })}
              placeholder="예: order@company.com"
              className={errors.ccEmail ? 'border-rose-500' : ''}
            />
            {errors.ccEmail && <p className="text-xs text-rose-500">{errors.ccEmail}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">전화번호</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="예: 02-1234-5678"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              취소
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-slate-900 hover:bg-slate-800">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : isEdit ? (
                '수정'
              ) : (
                '추가'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

