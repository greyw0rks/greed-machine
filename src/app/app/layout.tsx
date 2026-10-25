import { FoundationShell } from "@/components/foundation/shell";
import { foundationData } from "@/lib/foundation/store";
export const dynamic="force-dynamic";
export default function WorkspaceLayout({children}:{children:React.ReactNode}){return <FoundationShell initial={foundationData()}>{children}</FoundationShell>;}
