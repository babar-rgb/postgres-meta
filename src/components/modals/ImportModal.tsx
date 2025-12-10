import { useState } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertTriangle } from 'lucide-react';
import { parseCsv } from '../../utils/csvHelpers';
import { useDataImport } from '../../hooks/useDataImport';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    tableName: string;
}

export default function ImportModal({ isOpen, onClose, tableName }: ImportModalProps) {
    const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [dragActive, setDragActive] = useState(false);

    const { importData, isImporting, error } = useDataImport({
        tableName,
        onSuccess: () => {
            setStep('success');
            setTimeout(() => {
                onClose();
                resetState();
            }, 2000);
        }
    });

    const resetState = () => {
        setStep('upload');
        setPreviewData([]);
        setPreviewData([]);
        setDragActive(false);
    };

    if (!isOpen) return null;

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = async (selectedFile: File) => {
        if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith('.csv')) {
            alert("Please upload a valid CSV file.");
            return;
        }
        
        try {
            const data = await parseCsv(selectedFile);
            setPreviewData(data);
            setStep('preview');
        } catch (err) {
            console.error("Failed to parse CSV", err);
            alert("Failed to parse CSV file.");
        }
    };

    const handleImport = () => {
        importData(previewData);
    };

    const headers = previewData.length > 0 ? Object.keys(previewData[0]) : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-[#111] border border-[#333] rounded-lg shadow-xl w-[600px] max-w-full flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[#222]">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Upload size={18} className="text-blue-500" />
                        Import Data: <span className="text-subtle">{tableName}</span>
                    </h2>
                    <button onClick={onClose} className="text-subtle hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    {step === 'upload' && (
                        <div
                            className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg transition-colors ${dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-[#333] hover:border-[#444] bg-[#0c0c0c]'
                                }`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <FileSpreadsheet size={48} className="text-[#444] mb-4" />
                            <p className="text-white font-medium mb-1">Drag and drop your CSV file here</p>
                            <p className="text-subtle text-sm mb-6">or click to browse</p>

                            <input
                                type="file"
                                id="csv-upload"
                                className="hidden"
                                accept=".csv"
                                onChange={handleFileChange}
                            />
                            <label
                                htmlFor="csv-upload"
                                className="px-4 py-2 bg-[#222] hover:bg-[#333] text-white rounded-md cursor-pointer text-sm font-medium transition-colors border border-[#333]"
                            >
                                Browse Files
                            </label>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-white font-medium">Preview Data</h3>
                                    <p className="text-subtle text-xs">Expecting {previewData.length} rows</p>
                                </div>
                                <button onClick={resetState} className="text-xs text-blue-500 hover:text-blue-400">
                                    Change File
                                </button>
                            </div>

                            <div className="border border-[#333] rounded-md overflow-hidden bg-[#0c0c0c] mb-4 max-h-[300px] overflow-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[#1a1a1a] text-xs uppercase text-subtle font-medium">
                                        <tr>
                                            {headers.map(h => (
                                                <th key={h} className="px-3 py-2 border-b border-[#333] whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.slice(0, 5).map((row, i) => (
                                            <tr key={i} className="border-b border-[#222] last:border-0 hover:bg-[#111]">
                                                {headers.map(h => (
                                                    <td key={h} className="px-3 py-2 text-zinc-300 whitespace-nowrap overflow-hidden max-w-[150px] text-ellipsis">
                                                        {row[h]}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {previewData.length > 5 && (
                                    <div className="px-3 py-2 text-xs text-subtle italic bg-[#111] border-t border-[#222]">
                                        ... and {previewData.length - 5} more rows
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md flex items-start gap-2 text-red-400 text-sm">
                                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="h-16 w-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle size={32} className="text-green-500" />
                            </div>
                            <h3 className="text-xl font-medium text-white mb-2">Import Successful!</h3>
                            <p className="text-subtle">
                                {previewData.length} rows have been added to {tableName}.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 'preview' && (
                    <div className="p-4 border-t border-[#222] flex justify-end gap-2 bg-[#0c0c0c] rounded-b-lg">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-subtle hover:text-white transition-colors"
                            disabled={isImporting}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={isImporting}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isImporting ? 'Importing...' : `Import ${previewData.length} Rows`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
