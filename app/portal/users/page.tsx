import { Card, CardContent, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { createClient } from "@/lib/supabase/server";
export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase.from("user_profiles").select("display_name,email,phone,active").order("created_at", { ascending: false });
  return <Card><CardContent><Typography variant="h5">ผู้ใช้งานบริษัท</Typography><Table size="small"><TableHead><TableRow><TableCell>ชื่อ</TableCell><TableCell>อีเมล</TableCell><TableCell>โทรศัพท์</TableCell><TableCell>สถานะ</TableCell></TableRow></TableHead><TableBody>{(data ?? []).map((u,i)=> <TableRow key={i}><TableCell>{u.display_name}</TableCell><TableCell>{u.email}</TableCell><TableCell>{u.phone}</TableCell><TableCell>{u.active ? 'ใช้งาน':'ปิดใช้งาน'}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>;
}
