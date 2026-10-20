"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  saveApplicationStepAction,
  submitApplicationAction,
  initializeApplicationPaymentAction,
  verifyApplicationPaymentAction,
} from "@/lib/actions";
import { CheckCircle, ChevronLeft, ChevronRight, Upload, CreditCard, Loader2 } from "lucide-react";

export type ApplicationData = Record<string, string | number | boolean | null | undefined>;

const steps = [
  "Personal Information",
  "Education & Pageant Profile",
  "Essays & Advocacy",
  "Emergency & Documents",
  "Review & Payment",
];

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  options,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number | null;
  required?: boolean;
  options?: string[];
}) {
  const baseClass =
    "w-full rounded-xl border border-nlqi-green/20 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-nlqi-gold/50 focus:border-nlqi-gold";
  return (
    <label className="block">
      <span className="block text-sm font-medium text-nlqi-charcoal mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {type === "select" && options ? (
        <select name={name} defaultValue={defaultValue?.toString() || ""} className={baseClass} required={required}>
          <option value="">Select</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          name={name}
          defaultValue={defaultValue?.toString() || ""}
          rows={4}
          className={baseClass}
          required={required}
        />
      ) : (
        <input
          name={name}
          type={type}
          defaultValue={defaultValue?.toString() || ""}
          className={baseClass}
          required={required}
        />
      )}
    </label>
  );
}

function FileDrop({
  name,
  label,
  file,
  onFile,
}: {
  name: string;
  label: string;
  file: File | null;
  onFile: (file: File) => void;
}) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onFile(accepted[0]);
    },
    [onFile]
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg"], "application/pdf": [".pdf"] },
    multiple: false,
  });

  return (
    <div>
      <span className="block text-sm font-medium text-nlqi-charcoal mb-1">{label}</span>
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
          isDragActive ? "border-nlqi-gold bg-nlqi-gold/10" : "border-nlqi-green/20 hover:border-nlqi-gold"
        }`}
      >
        <input {...getInputProps()} name={name} />
        <Upload className="w-8 h-8 mx-auto text-nlqi-gold mb-2" />
        <p className="text-sm text-nlqi-charcoal/70">
          {file ? file.name : "Drag & drop or click to upload"}
        </p>
      </div>
    </div>
  );
}

export function ApplyForm({ application }: { application: Record<string, unknown> }) {
  const app = application as ApplicationData;
  const [step, setStep] = useState(Math.max(1, Number(app.currentStep) || 1));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [files, setFiles] = useState<{ idDocument: File | null; headshot: File | null; fullBody: File | null }>({
    idDocument: null,
    headshot: null,
    fullBody: null,
  });
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const reference = searchParams.get("reference");
    if (reference) {
      setLoading(true);
      verifyApplicationPaymentAction(reference).then((res) => {
        setLoading(false);
        if (res.success) {
          setMessage({ type: "success", text: "Payment confirmed. Thank you!" });
          router.replace("/apply");
        } else {
          setMessage({ type: "error", text: res.error || "Payment verification failed" });
        }
      });
    }
  }, [searchParams, router]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    Object.entries(files).forEach(([key, file]) => {
      if (file) formData.set(key, file);
    });

    const res = await saveApplicationStepAction(step, formData);
    setLoading(false);
    if (res.success) {
      setMessage({ type: "success", text: res.message || "Saved" });
      if (step < 5) setStep(step + 1);
      router.refresh();
    } else {
      setMessage({ type: "error", text: res.error || "Save failed" });
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    const res = await submitApplicationAction();
    setLoading(false);
    if (res.success) {
      setMessage({ type: "success", text: res.message || "Submitted" });
      router.refresh();
    } else {
      setMessage({ type: "error", text: res.error || "Submission failed" });
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    const res = await initializeApplicationPaymentAction();
    setLoading(false);
    if (res.success && res.data && typeof res.data === "object" && "authorizationUrl" in res.data) {
      window.location.href = (res.data as { authorizationUrl: string }).authorizationUrl;
    } else {
      setMessage({ type: "error", text: (res as { error?: string }).error || "Payment initiation failed" });
    }
  };

  const status = app.status as string;
  const paymentStatus = app.paymentStatus as string;

  if (status === "approved" && paymentStatus === "paid") {
    return (
      <div className="max-w-2xl mx-auto py-24 text-center">
        <CheckCircle className="w-16 h-16 text-nlqi-gold mx-auto mb-6" />
        <h2 className="text-3xl font-semibold text-nlqi-green mb-4">Application Complete</h2>
        <p className="text-nlqi-charcoal/70">
          Application number <strong>{app.applicationNumber}</strong> has been approved and payment confirmed.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nlqi-cream py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-semibold text-nlqi-green mb-2">Application Portal</h1>
          <p className="text-nlqi-charcoal/60">Application number: <strong>{app.applicationNumber}</strong></p>
        </div>

        <div className="mb-10">
          <div className="flex justify-between text-xs font-medium text-nlqi-charcoal/60 mb-2">
            {steps.map((s, i) => (
              <span key={s} className={step >= i + 1 ? "text-nlqi-green" : ""}>
                {i + 1}. {s}
              </span>
            ))}
          </div>
          <div className="h-2 bg-white rounded-full overflow-hidden">
            <motion.div
              className="h-full gold-gradient"
              initial={{ width: 0 }}
              animate={{ width: `${(step / 5) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-xl text-sm ${
              message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.form
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={handleSave}
            className="bg-white rounded-2xl shadow-sm border border-nlqi-gold/10 p-6 md:p-10"
          >
            <h2 className="text-2xl font-semibold text-nlqi-green mb-6">{steps[step - 1]}</h2>

            {step === 1 && (
              <div className="grid md:grid-cols-2 gap-6">
                <Field label="Title" name="title" defaultValue={app.title as string} options={["Miss", "Ms", "Mrs", "Dr"]} />
                <Field label="First Name" name="firstName" required defaultValue={app.firstName as string} />
                <Field label="Last Name" name="lastName" required defaultValue={app.lastName as string} />
                <Field label="Other Names" name="otherNames" defaultValue={app.otherNames as string} />
                <Field label="Email" name="email" type="email" required defaultValue={app.email as string} />
                <Field label="Phone" name="phone" type="tel" required defaultValue={app.phone as string} />
                <Field label="Date of Birth" name="dateOfBirth" type="date" defaultValue={app.dateOfBirth as string} />
                <Field label="Age" name="age" type="number" defaultValue={app.age as number} />
                <Field label="State of Origin" name="stateOfOrigin" required defaultValue={app.stateOfOrigin as string} />
                <Field label="LGA" name="lga" defaultValue={app.lga as string} />
                <Field label="Nationality" name="nationality" defaultValue={(app.nationality as string) || "Nigerian"} />
                <Field label="Occupation" name="occupation" defaultValue={app.occupation as string} />
                <Field label="City" name="city" defaultValue={app.city as string} />
              </div>
            )}

            {step === 2 && (
              <div className="grid md:grid-cols-2 gap-6">
                <Field label="Education Level" name="educationLevel" defaultValue={app.educationLevel as string} options={["SSCE", "OND", "HND", "BSc", "MSc", "PhD", "Other"]} />
                <Field label="Institution" name="institution" defaultValue={app.institution as string} />
                <Field label="Course of Study" name="courseOfStudy" defaultValue={app.courseOfStudy as string} />
                <Field label="Graduation Year" name="graduationYear" defaultValue={app.graduationYear as string} />
                <Field label="Height (cm)" name="height" defaultValue={app.height as string} />
                <Field label="Bust" name="bust" defaultValue={app.bust as string} />
                <Field label="Waist" name="waist" defaultValue={app.waist as string} />
                <Field label="Hips" name="hips" defaultValue={app.hips as string} />
                <Field label="Dress Size" name="dressSize" defaultValue={app.dressSize as string} />
                <Field label="Hair Color" name="hairColor" defaultValue={app.hairColor as string} />
                <Field label="Eye Color" name="eyeColor" defaultValue={app.eyeColor as string} />
                <Field label="Talents" name="talents" defaultValue={app.talents as string} />
                <Field label="Hobbies" name="hobbies" defaultValue={app.hobbies as string} />
                <Field label="Languages Spoken" name="languages" defaultValue={app.languages as string} />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <Field label="How did you hear about NLQI?" name="platformSource" defaultValue={app.platformSource as string} />
                <Field label="Why do you want to participate?" name="whyParticipate" type="textarea" required defaultValue={app.whyParticipate as string} />
                <Field label="What advocacy cause are you most passionate about?" name="advocacyInterest" type="textarea" required defaultValue={app.advocacyInterest as string} />
                <Field label="Describe a community project you would lead." name="communityProject" type="textarea" defaultValue={app.communityProject as string} />
                <Field label="Leadership experience" name="leadershipExperience" type="textarea" defaultValue={app.leadershipExperience as string} />
                <Field label="Social impact you have created" name="socialImpact" type="textarea" defaultValue={app.socialImpact as string} />
                <Field label="Career goals" name="careerGoals" type="textarea" defaultValue={app.careerGoals as string} />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <Field label="Emergency Contact Name" name="emergencyName" required defaultValue={app.emergencyName as string} />
                  <Field label="Emergency Phone" name="emergencyPhone" type="tel" required defaultValue={app.emergencyPhone as string} />
                  <Field label="Relationship" name="emergencyRelationship" required defaultValue={app.emergencyRelationship as string} />
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                  <FileDrop name="idDocument" label="ID Document (PDF/JPG)" file={files.idDocument} onFile={(f) => setFiles((s) => ({ ...s, idDocument: f }))} />
                  <FileDrop name="headshot" label="Headshot Photo" file={files.headshot} onFile={(f) => setFiles((s) => ({ ...s, headshot: f }))} />
                  <FileDrop name="fullBody" label="Full-body Photo" file={files.fullBody} onFile={(f) => setFiles((s) => ({ ...s, fullBody: f }))} />
                </div>
                {app.headshotPath && (
                  <p className="text-sm text-nlqi-charcoal/60">Existing headshot: {app.headshotPath as string}</p>
                )}
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6 text-sm">
                  <div className="p-4 bg-nlqi-cream rounded-xl">
                    <strong className="text-nlqi-green">Name:</strong> {app.title} {app.firstName} {app.lastName}
                  </div>
                  <div className="p-4 bg-nlqi-cream rounded-xl">
                    <strong className="text-nlqi-green">Email:</strong> {app.email}
                  </div>
                  <div className="p-4 bg-nlqi-cream rounded-xl">
                    <strong className="text-nlqi-green">State:</strong> {app.stateOfOrigin}
                  </div>
                  <div className="p-4 bg-nlqi-cream rounded-xl">
                    <strong className="text-nlqi-green">Status:</strong> {status} | {paymentStatus}
                  </div>
                </div>

                <label className="flex items-start gap-3">
                  <input type="checkbox" name="termsAgreed" required defaultChecked={!!app.termsAgreed} className="mt-1" />
                  <span className="text-sm text-nlqi-charcoal/80">
                    I agree to the terms and conditions of Nigeria Legacy Queen International.
                  </span>
                </label>
                <label className="flex items-start gap-3">
                  <input type="checkbox" name="consentSigned" required defaultChecked={!!app.consentSigned} className="mt-1" />
                  <span className="text-sm text-nlqi-charcoal/80">
                    I consent to the use of my data for the pageant and related activities.
                  </span>
                </label>

                {status === "draft" && (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-nlqi-green text-white font-semibold rounded-full hover:bg-nlqi-green-dark transition-colors disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Submit Application
                  </button>
                )}

                {status === "pending" && paymentStatus !== "paid" && (
                  <button
                    type="button"
                    onClick={handlePayment}
                    disabled={loading}
                    className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-nlqi-gold text-nlqi-green font-bold rounded-full hover:bg-nlqi-gold-light transition-colors disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                    Pay Application Fee (₦{process.env.NEXT_PUBLIC_APPLICATION_FEE || 5000})
                  </button>
                )}
              </div>
            )}

            <div className="flex justify-between mt-10">
              <button
                type="button"
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1}
                className="inline-flex items-center gap-2 px-6 py-3 border border-nlqi-green/20 rounded-full text-nlqi-green hover:bg-nlqi-green/5 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              {step < 5 && (
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-nlqi-green text-white rounded-full hover:bg-nlqi-green-dark disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Continue"}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              {step === 5 && (
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-nlqi-green text-white rounded-full hover:bg-nlqi-green-dark disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Review"}
                </button>
              )}
            </div>
          </motion.form>
        </AnimatePresence>
      </div>
    </div>
  );
}
