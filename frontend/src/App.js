import React, { useState, useRef } from 'react';
import { Upload, Sparkles, Mail, Edit, FileText, Send, CheckCircle, AlertCircle, Loader2, Copy, X } from 'lucide-react';

const API_BASE_URL = 'https://ai-summarizer-1-2nof.onrender.com'; // Updated to match backend port

function App() {
  const [transcript, setTranscript] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [summary, setSummary] = useState('');
  const [summaryId, setSummaryId] = useState('');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [recipientEmails, setRecipientEmails] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [inputMethod, setInputMethod] = useState('paste');
  const fileInputRef = useRef(null);

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 4000);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.txt')) {
      showAlert('error', 'Please upload a .txt file only');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/upload-transcript`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTranscript(data.transcript);
        setFileName(file.name);
        showAlert('success', 'Transcript uploaded successfully!');
      } else {
        throw new Error(data.detail || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showAlert('error', error.message || 'Failed to upload transcript');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!transcript.trim()) {
      showAlert('error', 'Please provide a transcript first');
      return;
    }

    if (!customPrompt.trim()) {
      showAlert('error', 'Please enter a custom instruction');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript,
          custom_prompt: customPrompt,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSummary(data.summary);
        setSummaryId(data.summary_id);
        setEditMode(true);
        showAlert('success', 'Summary generated successfully!');
      } else {
        throw new Error(data.detail || 'Summary generation failed');
      }
    } catch (error) {
      console.error('Summary generation error:', error);
      showAlert('error', error.message || 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSummary = async () => {
    if (!summaryId || !summary.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/update-summary`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary_id: summaryId,
          updated_summary: summary,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showAlert('success', 'Summary updated successfully!');
        setEditMode(false);
      } else {
        throw new Error(data.detail || 'Update failed');
      }
    } catch (error) {
      console.error('Update error:', error);
      showAlert('error', error.message || 'Failed to update summary');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = () => {
    if (!summary.trim()) {
      showAlert('error', 'No summary to send');
      return;
    }

    if (editMode) {
      showAlert('error', 'Please save your edits before sending');
      return;
    }

    const subject = encodeURIComponent('Meeting Summary');
    const body = encodeURIComponent(`Hi,\n\nPlease find the meeting summary below:\n\n${summary}\n\nBest regards`);
    const recipients = recipientEmails ? `?subject=${subject}&body=${body}` : `?subject=${subject}&body=${body}`;
    
    window.location.href = `mailto:${recipientEmails}${recipients}`;
    showAlert('success', 'Email client opened with summary');
  };

  const clearAll = () => {
    setTranscript('');
    setSummary('');
    setCustomPrompt('');
    setFileName('');
    setSummaryId('');
    setEditMode(false);
    setRecipientEmails('');
  };

  const promptExamples = [
    "Summarize in bullet points for executives",
    "Extract key action items and deadlines",
    "Create executive summary with decisions",
    "List main discussion points and next steps"
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-2xl">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              AI Notes Summarizer
            </h1>
          </div>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Transform your meeting notes into actionable summaries with AI
          </p>
        </div>

        {/* Alert */}
        {alert.show && (
          <div className={`mb-8 p-4 rounded-lg border flex items-center gap-3 ${
            alert.type === 'error' 
              ? 'bg-red-950/50 text-red-200 border-red-800/30' 
              : 'bg-emerald-950/50 text-emerald-200 border-emerald-800/30'
          }`}>
            {alert.type === 'error' ? (
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
            ) : (
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <span className="text-base font-medium">{alert.message}</span>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Input */}
          <div className="space-y-6">
            {/* Input Method Toggle */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl backdrop-blur-sm">
              <div className="p-6 pb-4">
                <h3 className="text-gray-100 text-xl font-semibold">Input Method</h3>
                <p className="text-gray-400 text-sm mt-1">Choose how to provide your meeting notes</p>
              </div>
              <div className="p-6 pt-0">
                <div className="flex rounded-lg bg-gray-800 border border-gray-700 p-1">
                  <button
                    onClick={() => setInputMethod('paste')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                      inputMethod === 'paste'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    <Copy className="h-4 w-4" />
                    Paste Text
                  </button>
                  <button
                    onClick={() => setInputMethod('upload')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                      inputMethod === 'upload'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    <Upload className="h-4 w-4" />
                    Upload File
                  </button>
                </div>
                
                <div className="mt-6">
                  {inputMethod === 'paste' ? (
                    <div className="space-y-4">
                      <label className="text-gray-300 text-sm font-medium block">
                        Paste your meeting notes here
                      </label>
                      <textarea
                        placeholder="Paste your meeting transcript, notes, or any text you want to summarize..."
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        className="w-full min-h-[200px] p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none outline-none"
                      />
                      {transcript && (
                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-900/30 text-emerald-300 border border-emerald-800/50 rounded-full text-sm">
                          <CheckCircle className="h-3 w-3" />
                          {transcript.length} characters
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div 
                        className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-blue-500/50 transition-all cursor-pointer bg-gray-800/30 hover:bg-gray-800/50"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-300 mb-2">
                          {fileName ? `Selected: ${fileName}` : 'Click to upload .txt file'}
                        </p>
                        <p className="text-sm text-gray-500">Supports .txt files only</p>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Custom Prompt */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl backdrop-blur-sm">
              <div className="p-6 pb-4">
                <h3 className="text-gray-100 text-xl font-semibold">AI Instructions</h3>
                <p className="text-gray-400 text-sm mt-1">Tell the AI how to summarize your content</p>
              </div>
              <div className="p-6 pt-0 space-y-6">
                <div>
                  <label className="text-gray-300 text-sm font-medium mb-3 block">
                    Your Instructions
                  </label>
                  <textarea
                    placeholder="e.g., Create bullet points highlighting key decisions and action items..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="w-full min-h-[100px] p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
                
                {/* Quick Examples */}
                <div>
                  <label className="text-gray-300 text-sm font-medium mb-3 block">
                    Quick Templates:
                  </label>
                  <div className="grid gap-2">
                    {promptExamples.map((example, index) => (
                      <button
                        key={index}
                        onClick={() => setCustomPrompt(example)}
                        className="text-left text-sm p-3 rounded-lg bg-gray-800/30 border border-gray-700/50 hover:border-blue-500/50 hover:bg-gray-800/50 transition-all text-gray-300 hover:text-gray-100"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={handleGenerateSummary}
                    disabled={loading || !transcript || !customPrompt}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-6 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        Generate Summary
                      </>
                    )}
                  </button>
                  
                  <button 
                    onClick={clearAll}
                    className="px-6 py-6 border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-200 hover:border-gray-600 rounded-xl transition-all"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Summary & Actions */}
          <div className="space-y-6">
            {/* Generated Summary */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl backdrop-blur-sm">
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-gray-100 text-xl font-semibold">AI Summary</h3>
                    <p className="text-gray-400 text-sm mt-1">
                      {editMode ? 'Edit your summary before sharing' : 'Your generated summary'}
                    </p>
                  </div>
                  {summary && (
                    <button
                      onClick={() => editMode ? handleUpdateSummary() : setEditMode(true)}
                      disabled={loading}
                      className="flex items-center gap-1 px-4 py-2 border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-gray-100 rounded-lg transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : editMode ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Edit className="h-4 w-4" />
                      )}
                      {editMode ? 'Save' : 'Edit'}
                    </button>
                  )}
                </div>
              </div>
              <div className="p-6 pt-0">
                {summary ? (
                  <div className="space-y-4">
                    <textarea
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      readOnly={!editMode}
                      className={`w-full min-h-[300px] p-4 text-sm leading-relaxed rounded-lg outline-none ${
                        editMode 
                          ? 'bg-gray-800/50 border border-gray-700 text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' 
                          : 'bg-gray-800/30 border border-gray-700/50 text-gray-200 cursor-default'
                      }`}
                    />
                    {editMode && (
                      <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-950/30 p-3 rounded-lg border border-amber-800/30">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        Save your changes before sending the summary
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16 text-gray-500">
                    <Sparkles className="h-16 w-16 mx-auto mb-6 text-gray-700" />
                    <p className="text-lg mb-2">Your AI summary will appear here</p>
                    <p className="text-sm">Provide content and generate a summary to get started</p>
                  </div>
                )}
              </div>
            </div>

            {/* Email Sharing */}
            {summary && (
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl backdrop-blur-sm">
                <div className="p-6 pb-4">
                  <h3 className="text-gray-100 text-xl font-semibold">Share Summary</h3>
                  <p className="text-gray-400 text-sm mt-1">Send your summary via email</p>
                </div>
                <div className="p-6 pt-0 space-y-4">
                  <div>
                    <label className="text-gray-300 text-sm font-medium mb-2 block">
                      Recipient Email(s) (optional)
                    </label>
                    <input
                      type="email"
                      placeholder="recipient@example.com"
                      value={recipientEmails}
                      onChange={(e) => setRecipientEmails(e.target.value)}
                      className="w-full p-3 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Leave empty to open your email client without recipients
                    </p>
                  </div>
                  
                  <button
                    onClick={handleSendEmail}
                    disabled={editMode}
                    className={`w-full font-medium py-6 rounded-xl shadow-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                      editMode 
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white hover:shadow-2xl'
                    }`}
                  >
                    <Send className="h-5 w-5" />
                    {editMode ? 'Save Changes First' : 'Send via Email'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
