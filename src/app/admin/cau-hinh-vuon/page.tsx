import { requireUser } from "@/lib/auth";
import { getGardenPreset } from "@/lib/gardenPreset";
import { saveGardenPresetAction } from "@/lib/gardenActions";
import { PageHeader } from "@/components/ui";
import { GardenSettingsForm } from "@/components/garden/GardenSettingsForm";

/** Bộ cấu hình chuẩn của vườn lớp: chỉ quản trị sửa; lớp tạo mới tự dùng bộ này */
export default async function GardenPresetPage() {
  await requireUser(["ADMIN"]);
  const preset = await getGardenPreset();
  return (
    <>
      <PageHeader
        title="Cấu hình chuẩn vườn lớp"
        subtitle="Lớp tạo mới (kể cả tạo lớp năm học mới từ năm trước) tự dùng bộ này; GVCN chỉnh riêng cho lớp mình nếu muốn. Sửa bộ chuẩn không thay đổi các lớp đang có."
      />
      <div className="card">
        <GardenSettingsForm save={saveGardenPresetAction} initial={preset} submitLabel="Lưu bộ chuẩn" />
      </div>
    </>
  );
}
