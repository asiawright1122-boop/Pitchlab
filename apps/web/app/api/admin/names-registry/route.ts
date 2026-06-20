import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { verifyAdminSession } from "@/lib/admin";

export const dynamic = "force-dynamic";

function getRegistryPath() {
  const rootPath = path.join(process.cwd(), "public/data/names_registry.json");
  if (fs.existsSync(rootPath)) return rootPath;
  // Fallback for monorepo root execution
  return path.join(process.cwd(), "apps/web/public/data/names_registry.json");
}

export async function GET(request: Request) {
  try {
    if (!(await verifyAdminSession(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const registryPath = getRegistryPath();
    let registry: Record<string, string[]> = {};
    
    if (fs.existsSync(registryPath)) {
      try {
        registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
      } catch (e) {
        console.error("[Names Registry API] Parse error:", e);
      }
    }

    return NextResponse.json({ registry });
  } catch (error: any) {
    console.error("[Names Registry API] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await verifyAdminSession(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, canonicalName, alias } = body as {
      action: "add" | "delete" | "add_canonical";
      canonicalName: string;
      alias?: string;
    };

    if (!canonicalName) {
      return NextResponse.json({ error: "canonicalName is required" }, { status: 400 });
    }

    const registryPath = getRegistryPath();
    const dataDir = path.dirname(registryPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    let registry: Record<string, string[]> = {};
    if (fs.existsSync(registryPath)) {
      try {
        registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
      } catch (e) {
        // use empty
      }
    }

    let updated = false;

    if (action === "add") {
      if (!alias) {
        return NextResponse.json({ error: "alias is required for add action" }, { status: 400 });
      }
      
      const cleanCanonical = canonicalName.trim();
      const cleanAlias = alias.trim();

      if (!registry[cleanCanonical]) {
        registry[cleanCanonical] = [];
      }
      if (!registry[cleanCanonical].includes(cleanAlias)) {
        registry[cleanCanonical].push(cleanAlias);
        updated = true;
      }
    } else if (action === "delete") {
      if (!alias) {
        return NextResponse.json({ error: "alias is required for delete action" }, { status: 400 });
      }
      
      const cleanCanonical = canonicalName.trim();
      const cleanAlias = alias.trim();

      if (registry[cleanCanonical]) {
        const index = registry[cleanCanonical].indexOf(cleanAlias);
        if (index !== -1) {
          registry[cleanCanonical].splice(index, 1);
          updated = true;
          
          // 如果别名列表为空，是否删掉规范名？在此选择保留规范名，只清空别名
        }
      }
    } else if (action === "add_canonical") {
      const cleanCanonical = canonicalName.trim();
      if (!registry[cleanCanonical]) {
        registry[cleanCanonical] = [];
        updated = true;
      }
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (updated) {
      fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), "utf8");
    }

    return NextResponse.json({ success: true, registry });
  } catch (error: any) {
    console.error("[Names Registry API] POST Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
