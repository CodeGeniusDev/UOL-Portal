
"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/frontend/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { UOL_DEPARTMENTS } from '@/backend/departments';

export default function Onboarding() {
    const router = useRouter();
    const [selectedDept, setSelectedDept] = useState<string>("");
    const [search, setSearch] = useState<string>("");

    const filteredDepts = UOL_DEPARTMENTS.filter(d => 
        d.toLowerCase().includes(search.toLowerCase())
    );

    const handleContinue = () => {
        if (selectedDept) {
            // Generate the matching ID exactly as it is seeded in the database
            const deptId = selectedDept.replace(/\s+/g, '-').toLowerCase();
            localStorage.setItem("uol_department_id", deptId);
            localStorage.setItem("uol_department_name", selectedDept);
            router.push("/student/dashboard");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="text-2xl text-uol-green">Student Setup</CardTitle>
                    <CardDescription>Tell us where you belong so we can help you better.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Search Department</label>
                            <input 
                                type="text"
                                placeholder="Type department name..."
                                className="w-full p-2 border rounded-md focus:ring-1 focus:ring-uol-green outline-none"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Department</label>
                            <div className="grid gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                {filteredDepts.length > 0 ? filteredDepts.map((dept) => (
                                    <div
                                        key={dept}
                                        className={`p-3 border rounded-md cursor-pointer transition-colors ${selectedDept === dept ? 'border-uol-green bg-green-50 ring-1 ring-uol-green' : 'hover:border-gray-300 bg-white'}`}
                                        onClick={() => setSelectedDept(dept)}
                                    >
                                        {dept}
                                    </div>
                                )) : (
                                    <p className="text-sm text-gray-500 py-4 text-center italic">No departments match your search.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <Button
                        className="w-full bg-uol-green hover:bg-uol-green/90"
                        disabled={!selectedDept}
                        onClick={handleContinue}
                    >
                        Continue to Dashboard
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
