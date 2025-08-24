import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <AlertTriangle className="w-16 h-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold">Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access this page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            This page is restricted to specific user roles. Please contact your administrator if you believe this is an error.
          </p>
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link to="/login">Back to Login</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}