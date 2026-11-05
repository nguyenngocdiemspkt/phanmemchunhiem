"use server";

import { redirect } from "next/navigation";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { DEFAULT_QUESTIONS } from "@/lib/questions";
import { defaultYearDates, firstYearOf, suggestedYearName } from "@/lib/schoolYear";

export type SetupState = { error?: string } | null;

function keyMatches(input: string) {
  const expected = process.env.SETUP_KEY;
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function setupAction(_prev: SetupState, formData: FormData): Promise<SetupState> {
  if (await prisma.user.count({ where: { role: "ADMIN" } })) return { error: "Hệ thống đã được cài đặt." };
  if (!keyMatches(String(formData.get("setupKey") ?? ""))) return { error: "Mã cài đặt không đúng." };

  const fullName = String(formData.get("fullName") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!fullName) return { error: "Vui lòng nhập họ tên." };
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    return { error: "Tên đăng nhập 3–40 ký tự, chỉ gồm chữ thường không dấu, số, dấu chấm, gạch." };
  }
  if (password.length < 8) return { error: "Mật khẩu quản trị phải có ít nhất 8 ký tự." };

  const admin = await prisma.user.create({
    data: {
      fullName,
      username,
      role: "ADMIN",
      passwordHash: await hashPassword(password),
      mustChangePassword: false,
    },
  });
  await prisma.formTemplate.create({
    data: {
      name: "Phiếu tự đánh giá tuần",
      description: "Mẫu phiếu mặc định của nhà trường",
      questions: DEFAULT_QUESTIONS,
      isShared: true,
      ownerId: admin.id,
    },
  });
  // Năm học hiện tại với các mốc gợi ý, quản trị chỉnh lại ở mục Năm học
  if ((await prisma.schoolYear.count()) === 0) {
    const name = suggestedYearName();
    await prisma.schoolYear.create({ data: { name, ...defaultYearDates(firstYearOf(name)!), isCurrent: true } });
  }
  redirect("/dang-nhap");
}
