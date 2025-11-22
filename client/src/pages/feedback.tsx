import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StarRating } from "@/components/StarRating";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FeedbackRatings {
  // Functional Suitability (3)
  functionalCompleteness: number | null;
  functionalCorrectness: number | null;
  functionalAppropriateness: number | null;
  // Performance Efficiency (3)
  timeBehaviour: number | null;
  resourceUtilization: number | null;
  capacity: number | null;
  // Compatibility (2)
  coExistence: number | null;
  interoperability: number | null;
  // Usability (6)
  appropriatenessRecognizability: number | null;
  learnability: number | null;
  operability: number | null;
  userErrorProtection: number | null;
  uiAesthetics: number | null;
  accessibility: number | null;
  // Reliability (4)
  maturity: number | null;
  availability: number | null;
  faultTolerance: number | null;
  recoverability: number | null;
  // Security (5)
  confidentiality: number | null;
  integrity: number | null;
  nonRepudiation: number | null;
  accountability: number | null;
  authenticity: number | null;
  // Maintainability (5)
  modularity: number | null;
  reusability: number | null;
  analysability: number | null;
  modifiability: number | null;
  testability: number | null;
  // Portability (3)
  adaptability: number | null;
  installability: number | null;
  replaceability: number | null;
  // UX Items (4)
  clarityOfInstructions: number | null;
  comfortAndErgonomics: number | null;
  navigationIntuitiveness: number | null;
  userSatisfaction: number | null;
}

export default function FeedbackPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showBackDialog, setShowBackDialog] = useState(false);
  const [userId, setUserId] = useState("");
  const [comments, setComments] = useState("");
  const [ratings, setRatings] = useState<FeedbackRatings>({
    functionalCompleteness: null,
    functionalCorrectness: null,
    functionalAppropriateness: null,
    timeBehaviour: null,
    resourceUtilization: null,
    capacity: null,
    coExistence: null,
    interoperability: null,
    appropriatenessRecognizability: null,
    learnability: null,
    operability: null,
    userErrorProtection: null,
    uiAesthetics: null,
    accessibility: null,
    maturity: null,
    availability: null,
    faultTolerance: null,
    recoverability: null,
    confidentiality: null,
    integrity: null,
    nonRepudiation: null,
    accountability: null,
    authenticity: null,
    modularity: null,
    reusability: null,
    analysability: null,
    modifiability: null,
    testability: null,
    adaptability: null,
    installability: null,
    replaceability: null,
    clarityOfInstructions: null,
    comfortAndErgonomics: null,
    navigationIntuitiveness: null,
    userSatisfaction: null,
  });

  const updateRating = (key: keyof FeedbackRatings, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

  // Count how many questions have been answered
  const answeredCount = Object.values(ratings).filter((v) => v !== null).length;
  const totalQuestions = 35;
  const hasAnyAnswers = answeredCount > 0;

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/feedback", data);
    },
    onSuccess: () => {
      toast({
        title: "Thank you!",
        description: "Your feedback has been submitted successfully.",
      });
      setTimeout(() => navigate("/"), 2000);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    },
  });

  const calculateAverages = (r: FeedbackRatings) => {
    return {
      avgFunctionalSuitability: ((r.functionalCompleteness! + r.functionalCorrectness! + r.functionalAppropriateness!) / 3),
      avgPerformanceEfficiency: ((r.timeBehaviour! + r.resourceUtilization! + r.capacity!) / 3),
      avgCompatibility: ((r.coExistence! + r.interoperability!) / 2),
      avgUsability: ((r.appropriatenessRecognizability! + r.learnability! + r.operability! + r.userErrorProtection! + r.uiAesthetics! + r.accessibility!) / 6),
      avgReliability: ((r.maturity! + r.availability! + r.faultTolerance! + r.recoverability!) / 4),
      avgSecurity: ((r.confidentiality! + r.integrity! + r.nonRepudiation! + r.accountability! + r.authenticity!) / 5),
      avgMaintainability: ((r.modularity! + r.reusability! + r.analysability! + r.modifiability! + r.testability!) / 5),
      avgPortability: ((r.adaptability! + r.installability! + r.replaceability!) / 3),
      avgUxItems: ((r.clarityOfInstructions! + r.comfortAndErgonomics! + r.navigationIntuitiveness! + r.userSatisfaction!) / 4),
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all ratings are filled
    const missingRatings = Object.entries(ratings).filter(([, value]) => value === null);
    if (missingRatings.length > 0) {
      toast({
        title: "Incomplete Form",
        description: `Please answer all ${totalQuestions} questions before submitting.`,
        variant: "destructive",
      });
      return;
    }

    if (!userId.trim()) {
      toast({
        title: "User # Required",
        description: "Please enter your User # before submitting.",
        variant: "destructive",
      });
      return;
    }

    const averages = calculateAverages(ratings as Required<FeedbackRatings>);

    submitMutation.mutate({
      userId: userId.trim(),
      comments: comments.trim() || null,
      ...ratings,
      ...averages,
    });
  };

  const handleBackClick = () => {
    if (hasAnyAnswers) {
      setShowBackDialog(true);
    } else {
      navigate("/");
    }
  };

  const RatingRow = ({ label, field }: { label: string; field: keyof FeedbackRatings }) => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4 border-b last:border-b-0">
      <Label className="text-base flex-1">{label}</Label>
      <StarRating
        value={ratings[field]}
        onChange={(value) => updateRating(field, value)}
        disabled={submitMutation.isPending}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-accent/10 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBackClick}
            data-testid="button-back"
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
          <div className="text-sm text-muted-foreground">
            {answeredCount} of {totalQuestions} questions answered
          </div>
        </div>

        {/* Title and Instructions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-3xl">Feedback Form</CardTitle>
            <CardDescription className="text-base">
              Please rate each statement based on your experience using the iCCAT kiosk.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="font-semibold mb-2">Rating Scale:</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
                <div><span className="font-medium">5</span> = Very High</div>
                <div><span className="font-medium">4</span> = High</div>
                <div><span className="font-medium">3</span> = Moderate</div>
                <div><span className="font-medium">2</span> = Low</div>
                <div><span className="font-medium">1</span> = Very Low</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Functional Suitability */}
          <Card>
            <CardHeader>
              <CardTitle>1. Functional Suitability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <RatingRow
                label="The kiosk provides all features I need for navigation and information."
                field="functionalCompleteness"
              />
              <RatingRow
                label="The kiosk displays accurate and correct campus information."
                field="functionalCorrectness"
              />
              <RatingRow
                label="The kiosk functions are helpful and appropriate for campus use."
                field="functionalAppropriateness"
              />
            </CardContent>
          </Card>

          {/* 2. Performance Efficiency */}
          <Card>
            <CardHeader>
              <CardTitle>2. Performance Efficiency</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <RatingRow
                label="The kiosk responds quickly when I interact with it."
                field="timeBehaviour"
              />
              <RatingRow
                label="The kiosk operates smoothly without lag or overheating."
                field="resourceUtilization"
              />
              <RatingRow
                label="The kiosk handles multiple users/tasks without performance issues."
                field="capacity"
              />
            </CardContent>
          </Card>

          {/* 3. Compatibility */}
          <Card>
            <CardHeader>
              <CardTitle>3. Compatibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <RatingRow
                label="The kiosk works properly alongside other campus systems/devices."
                field="coExistence"
              />
              <RatingRow
                label="The kiosk integrates well with external services (e.g., QR code to mobile)."
                field="interoperability"
              />
            </CardContent>
          </Card>

          {/* 4. Usability */}
          <Card>
            <CardHeader>
              <CardTitle>4. Usability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <RatingRow
                label="I immediately understood how to use the kiosk."
                field="appropriatenessRecognizability"
              />
              <RatingRow
                label="It is easy to learn how to navigate the kiosk."
                field="learnability"
              />
              <RatingRow
                label="The kiosk is easy to operate and control."
                field="operability"
              />
              <RatingRow
                label="The kiosk helps prevent errors or mistakes while using it."
                field="userErrorProtection"
              />
              <RatingRow
                label="The kiosk interface is visually appealing."
                field="uiAesthetics"
              />
              <RatingRow
                label="The kiosk can be used comfortably by different types of users."
                field="accessibility"
              />
            </CardContent>
          </Card>

          {/* 5. Reliability */}
          <Card>
            <CardHeader>
              <CardTitle>5. Reliability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <RatingRow
                label="The kiosk works reliably during normal use."
                field="maturity"
              />
              <RatingRow
                label="The kiosk is consistently available whenever needed."
                field="availability"
              />
              <RatingRow
                label="The kiosk continues to operate even when minor issues occur."
                field="faultTolerance"
              />
              <RatingRow
                label="The kiosk can easily recover from errors or interruptions."
                field="recoverability"
              />
            </CardContent>
          </Card>

          {/* 6. Security */}
          <Card>
            <CardHeader>
              <CardTitle>6. Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <RatingRow
                label="The kiosk protects personal or sensitive information."
                field="confidentiality"
              />
              <RatingRow
                label="The kiosk prevents unauthorized changes to data."
                field="integrity"
              />
              <RatingRow
                label="The kiosk clearly logs or records actions when necessary."
                field="nonRepudiation"
              />
              <RatingRow
                label="The kiosk's transactions/actions can be traced if needed."
                field="accountability"
              />
              <RatingRow
                label="The kiosk verifies all accessed information correctly."
                field="authenticity"
              />
            </CardContent>
          </Card>

          {/* 7. Maintainability */}
          <Card>
            <CardHeader>
              <CardTitle>7. Maintainability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <RatingRow
                label="The kiosk is designed in parts/modules that are easy to manage."
                field="modularity"
              />
              <RatingRow
                label="Its components or features can be reused in other systems."
                field="reusability"
              />
              <RatingRow
                label="Issues or errors in the kiosk are easy to identify."
                field="analysability"
              />
              <RatingRow
                label="The kiosk can be updated or improved without difficulty."
                field="modifiability"
              />
              <RatingRow
                label="The kiosk can be tested effectively for improvements."
                field="testability"
              />
            </CardContent>
          </Card>

          {/* 8. Portability */}
          <Card>
            <CardHeader>
              <CardTitle>8. Portability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <RatingRow
                label="The kiosk can adapt to different locations or setups."
                field="adaptability"
              />
              <RatingRow
                label="The kiosk is easy to install and configure."
                field="installability"
              />
              <RatingRow
                label="Its components can be replaced without compatibility issues."
                field="replaceability"
              />
            </CardContent>
          </Card>

          {/* 9. UX Items */}
          <Card>
            <CardHeader>
              <CardTitle>9. User Experience</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <RatingRow
                label="The kiosk instructions are clear and easy to follow."
                field="clarityOfInstructions"
              />
              <RatingRow
                label="The height and screen angle are comfortable to use."
                field="comfortAndErgonomics"
              />
              <RatingRow
                label="The flow of screens is simple and not confusing."
                field="navigationIntuitiveness"
              />
              <RatingRow
                label="Overall, I am satisfied with the kiosk experience."
                field="userSatisfaction"
              />
            </CardContent>
          </Card>

          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle>Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userId">User # <span className="text-destructive">*</span></Label>
                <Input
                  id="userId"
                  data-testid="input-user-id"
                  placeholder="Enter your User # (e.g., User 1, Student 123)"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  disabled={submitMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comments">Comments (Optional)</Label>
                <Textarea
                  id="comments"
                  data-testid="textarea-comments"
                  placeholder="Share any additional thoughts or suggestions..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  disabled={submitMutation.isPending}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-center">
            <Button
              type="submit"
              size="lg"
              disabled={submitMutation.isPending}
              data-testid="button-submit"
              className="gap-2 min-w-48"
            >
              {submitMutation.isPending ? (
                "Submitting..."
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Feedback
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showBackDialog} onOpenChange={setShowBackDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {answeredCount} question{answeredCount !== 1 ? "s" : ""}. 
              If you go back now, your feedback will be lost. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Feedback</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate("/")}>
              Discard and Go Back
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
