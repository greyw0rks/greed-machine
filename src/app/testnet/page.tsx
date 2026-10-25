import { BusinessProof } from "@/components/foundation/business-proof";
import { savedBusinessReport } from "@/lib/business/report";
export const dynamic="force-dynamic";
export default async function TestnetPage(){
  try{return <BusinessProof initial={await savedBusinessReport()}/>;}catch{return <BusinessProof initial={null} initialError="Saved evidence needs review before it can be displayed."/>;}
}
