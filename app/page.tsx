
import Link from 'next/link';
import { Button } from '@/frontend/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { GraduationCap, ShieldCheck } from 'lucide-react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="text-center mb-10 space-y-4">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-uol-green">
          THE UNIVERSITY OF LAHORE
        </h1>
        <p className="text-xl text-uol-lime font-medium">
          Student Assistant Portal
        </p>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Welcome to the new AI-powered assistance hub. Please select your role to continue.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 w-full max-w-4xl">
        <Link href="/admin/dashboard" className="group">
          <Card className="h-full transition-all hover:shadow-lg hover:border-uol-green/50 cursor-pointer">
            <CardHeader className="text-center">
              <ShieldCheck className="mx-auto h-12 w-12 text-uol-green group-hover:scale-110 transition-transform" />
              <CardTitle className="mt-4 text-2xl">Admin Staff</CardTitle>
              <CardDescription>Department Coordinators & Faculty</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Upload schedules, datesheets, and manage departmental knowledge base.
              </p>
              <Button className="w-full bg-uol-green hover:bg-uol-green/90">Access Admin Portal</Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/student/onboarding" className="group">
          <Card className="h-full transition-all hover:shadow-lg hover:border-uol-lime/50 cursor-pointer">
            <CardHeader className="text-center">
              <GraduationCap className="mx-auto h-12 w-12 text-uol-green group-hover:scale-110 transition-transform" />
              <CardTitle className="mt-4 text-2xl">Student / Newcomer</CardTitle>
              <CardDescription>Access schedules & AI Help</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Get instant answers about classes, exams, and university life.
              </p>
              <Button variant="secondary" className="w-full bg-uol-lime text-black hover:bg-uol-lime/80">Student Login</Button>
            </CardContent>
          </Card>
        </Link>
      </div>
    </main>
  );
}
