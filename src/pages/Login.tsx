import { useState } from "react";
import { Link } from "react-router-dom";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

export default function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const { toast } = useToast();

  const validatePassword = (password: string) => {
    const minLength = password.length >= 6;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return minLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!validatePassword(formData.password)) {
      setError("Password must be at least 6 characters with uppercase, lowercase, number, and special character");
      setIsLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      toast({
        title: "Success",
        description: "Logged in successfully!",
      });
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!formData.email) {
      setError("Please enter your email address first");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, formData.email);
      setResetEmailSent(true);
      toast({
        title: "Reset email sent",
        description: "Check your email for password reset instructions",
      });
    } catch (error: any) {
      setError(error.message);
    }
  };

  const passwordStrength = () => {
    const { password } = formData;
    if (!password) return { strength: 0, text: "" };
    
    const checks = [
      password.length >= 6,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /\d/.test(password),
      /[!@#$%^&*(),.?":{}|<>]/.test(password)
    ];
    
    const strength = checks.filter(Boolean).length;
    const strengthText = ["Very Weak", "Weak", "Fair", "Good", "Strong"][strength] || "";
    
    return { strength, text: strengthText };
  };

  const { strength, text: strengthText } = passwordStrength();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center mb-8">
          <img 
            src="/lovable-uploads/d3e71f67-5eb2-4568-acc2-f04fe120fa6b.png" 
            alt="Sevinro Distributors" 
            className="h-16 w-auto"
          />
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {resetEmailSent && (
              <Alert>
                <AlertDescription>
                  Password reset email sent! Check your inbox.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {formData.password && (
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-muted rounded">
                        <div 
                          className={`h-full rounded transition-all duration-300 ${
                            strength <= 1 ? 'bg-destructive w-1/5' :
                            strength <= 2 ? 'bg-yellow-500 w-2/5' :
                            strength <= 3 ? 'bg-blue-500 w-3/5' :
                            strength <= 4 ? 'bg-green-500 w-4/5' :
                            'bg-green-600 w-full'
                          }`}
                        />
                      </div>
                      <span className={`text-xs ${
                        strength <= 1 ? 'text-destructive' :
                        strength <= 2 ? 'text-yellow-600' :
                        strength <= 3 ? 'text-blue-600' :
                        strength <= 4 ? 'text-green-600' :
                        'text-green-700'
                      }`}>
                        {strengthText}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      Password must include: 6+ characters, uppercase, lowercase, number, and special character
                    </p>
                  </div>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !validatePassword(formData.password)}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            <div className="text-center">
              <Button
                variant="link"
                onClick={handlePasswordReset}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Forgot your password?
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}