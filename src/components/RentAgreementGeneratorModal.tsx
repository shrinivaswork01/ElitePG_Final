import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, FileText, CheckCircle2, Image as ImageIcon, Loader2, PenTool } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { generateAgreementPDF } from '../utils/generateAgreement';
import { format } from 'date-fns';
import { uploadToSupabase } from '../utils/storage';

interface RentAgreementGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: any;
  user: any;
  branch: any;
  pgConfig: any;
}

const TOTAL_STEPS = 4;

export const RentAgreementGeneratorModal: React.FC<RentAgreementGeneratorModalProps> = ({
  isOpen, onClose, tenant, user, branch, pgConfig
}) => {
  const { updateTenant } = useApp();
  const [step, setStep] = useState(1);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: (file: File | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File must be less than 5MB');
        return;
      }
      setFile(file);
    }
  };

  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  const handleGenerate = async () => {
    if (!idFile || !photoFile) {
      toast.error('Please upload required documents');
      return;
    }

    setIsGenerating(true);
    
    try {
      const photoDataUrl = await toBase64(photoFile);
      const signatureDataUrl = signatureFile ? await toBase64(signatureFile) : undefined;
      const fname = `PG_Agreement_${(tenant.name || 'Tenant').replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      
      // Generate the PDF — it will auto-download AND return a Blob
      const pdfBlob = await generateAgreementPDF(tenant, user, branch, pgConfig, photoDataUrl, fname, signatureDataUrl);
      
      if (!pdfBlob) {
        throw new Error('PDF Generation failed');
      }

      // Upload ID Proof to Supabase
      const idExt = idFile.name.split('.').pop();
      const idPath = `tenant_${tenant.id}/kyc_id_${Date.now()}.${idExt}`;
      await uploadToSupabase('kyc-docs', idPath, idFile);

      // Upload Agreement PDF to Supabase
      const pdfFile = new File([pdfBlob], fname, { type: 'application/pdf' });
      const agreementPath = `tenant_${tenant.id}/agreement_${Date.now()}.pdf`;
      const agreementUrl = await uploadToSupabase('agreements', agreementPath, pdfFile);

      // Save tenant signature if provided
      const updatePayload: any = { rentAgreementUrl: agreementUrl };
      if (signatureDataUrl) {
        updatePayload.signatureUrl = signatureDataUrl;
      }

      // Update Tenant record with agreement URL (and signature if uploaded)
      await updateTenant(tenant.id, updatePayload);
      
      toast.success('Agreement Generated & Saved!');
      onClose();
    } catch (error) {
       console.error(error);
       toast.error('Failed to generate agreement');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm">
        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           exit={{ opacity: 0, scale: 0.95 }}
           className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Generate Rent Agreement</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">KYC Verification for {tenant?.name}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper */}
          <div className="flex items-center px-6 py-4 bg-gray-50 dark:bg-white/5">
             {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
                <React.Fragment key={s}>
                   <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                      {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                   </div>
                   {s < TOTAL_STEPS && <div className={`flex-1 h-1 mx-2 rounded-full ${step > s ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`} />}
                </React.Fragment>
             ))}
          </div>

          <div className="p-6 overflow-y-auto">
            {/* Step 1: ID Proof */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
                  <FileText className="w-6 h-6" />
                  <h3 className="font-semibold">Step 1: ID Proof (Aadhaar / PAN)</h3>
                </div>
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-3 text-gray-400" />
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Click to upload ID Proof</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PDF, JPG or PNG (MAX. 5MB)</p>
                  </div>
                  <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileChange(e, setIdFile)} />
                </label>
                {idFile && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-xl text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> {idFile.name} attached!
                  </div>
                )}
                <button 
                  disabled={!idFile} 
                  onClick={() => setStep(2)} 
                  className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold disabled:opacity-50 mt-4"
                >
                  Continue to Photo
                </button>
              </div>
            )}

            {/* Step 2: Passport Photo */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
                  <ImageIcon className="w-6 h-6" />
                  <h3 className="font-semibold">Step 2: Tenant Passport Photo</h3>
                </div>
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-3 text-gray-400" />
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Upload Passport Photo</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Face must be clearly visible (JPG/PNG)</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, setPhotoFile)} />
                </label>
                {photoFile && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-xl text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Photo attached!
                  </div>
                )}
                <div className="flex gap-3 mt-4">
                   <button onClick={() => setStep(1)} className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold">Back</button>
                   <button disabled={!photoFile} onClick={() => setStep(3)} className="flex-1 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold disabled:opacity-50">Continue</button>
                </div>
              </div>
            )}

            {/* Step 3: Tenant Digital Signature */}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
                  <PenTool className="w-6 h-6" />
                  <h3 className="font-semibold">Step 3: Tenant Digital Signature</h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Upload a transparent PNG of the tenant's signature. This will appear on the agreement.</p>
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-3 text-gray-400" />
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Upload Signature PNG</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Transparent PNG recommended (MAX. 5MB)</p>
                  </div>
                  <input type="file" className="hidden" accept="image/png,image/jpeg" onChange={(e) => handleFileChange(e, setSignatureFile)} />
                </label>
                {signatureFile && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-xl text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Signature attached!
                  </div>
                )}
                <div className="flex gap-3 mt-4">
                   <button onClick={() => setStep(2)} className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold">Back</button>
                   <button onClick={() => setStep(4)} className="flex-1 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold">
                     {signatureFile ? 'Continue' : 'Skip & Continue'}
                   </button>
                </div>
              </div>
            )}

            {/* Step 4: Confirm & Generate */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="text-center space-y-2">
                   <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8" />
                   </div>
                   <h3 className="text-xl font-bold text-gray-900 dark:text-white">Ready to Generate</h3>
                   <p className="text-sm text-gray-500 dark:text-gray-400">The agreement will be digitally branded, compiled with your PG records, stamped with the tenant's photo, and saved permanently to secure storage.</p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 space-y-3 border border-gray-100 dark:border-gray-800">
                   <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Tenant Name</span>
                      <span className="font-bold text-gray-900 dark:text-white">{tenant?.name}</span>
                   </div>
                   <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">ID Proof</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">✓ Attached</span>
                   </div>
                   <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Passport Photo</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">✓ Ready</span>
                   </div>
                   <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Tenant Signature</span>
                      <span className={`font-semibold ${signatureFile ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {signatureFile ? '✓ Attached' : 'Skipped'}
                      </span>
                   </div>
                </div>

                <div className="flex gap-3 pt-2">
                   <button onClick={() => setStep(3)} disabled={isGenerating} className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold">Back</button>
                   <button 
                     onClick={handleGenerate} 
                     disabled={isGenerating} 
                     className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                   >
                     {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                     {isGenerating ? 'Generating & Uploading...' : 'Confirm & Generate'}
                   </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

