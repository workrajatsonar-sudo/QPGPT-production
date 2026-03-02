
import React, { useState, useEffect } from 'react';
import QPGPT from '../components/QPGPT';
import { supabase, downloadFile } from '../lib/supabase';
import { FileRecord, Standard, Subject } from '../types';
import { FileText, Download, Eye, Calendar, Tag, Filter, Search } from 'lucide-react';

const SearchPage = () => {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // Filters State
  const [filters, setFilters] = useState({
    standard: '',
    subject: '',
    year: '',
    type: '',
    search: ''
  });

  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // Initial fetch to populate dropdowns (mocking standard/subject data if DB is empty)
    const fetchMetadata = async () => {
      const { data: stdData } = await supabase.from('standards').select('*');
      if (stdData) setStandards(stdData);
      
      const { data: subData } = await supabase.from('subjects').select('*');
      if (subData) setSubjects(subData);
    };
    fetchMetadata();
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      let query = supabase.from('files').select(`
        *,
        standards (name),
        subjects (name)
      `);

      // KEY CHANGE: Filter by approval_status
      query = query.eq('approval_status', 'approved');

      if (filters.standard) query = query.eq('standard_id', filters.standard); // Assuming QPGPT maps this to ID, simplified here
      if (filters.subject) query = query.ilike('title', `%${filters.subject}%`); // Simple fuzzy match on title if subject ID unknown
      if (filters.type) query = query.eq('file_type', filters.type);
      if (filters.search) query = query.textSearch('search_text', filters.search, { type: 'websearch' });

      // If no search, just get latest
      if (!filters.search && !filters.standard && !filters.subject) {
        query = query.order('created_at', { ascending: false }).limit(20);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching files:', error);
        // Fallback for demo if DB is empty or connection fails
        setFiles([]); 
      } else {
        setFiles(data as any[] || []);
      }

      // Log search
      if (filters.search) {
         await supabase.from('search_logs').insert({
           query: filters.search,
           filters_json: filters
         });
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleQPGPTSearch = (newFilters: any) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({ standard: '', subject: '', year: '', type: '', search: '' });
  };

  const handleDownload = (path: string) => {
    downloadFile(path);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <QPGPT />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Mobile Filter Toggle */}
        <button 
          className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4" /> Filters
        </button>

        {/* Sidebar Filters */}
        <div className={`w-full lg:w-64 flex-shrink-0 space-y-6 ${showFilters ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Filters</h3>
              {(filters.standard || filters.subject || filters.type) && (
                <button onClick={clearFilters} className="text-xs text-red-500 hover:underline">Clear all</button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Standard</label>
                <select 
                  className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  value={filters.standard}
                  onChange={(e) => setFilters({...filters, standard: e.target.value})}
                >
                  <option value="">All Standards</option>
                  {standards.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
                <select 
                  className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  value={filters.subject}
                  onChange={(e) => setFilters({...filters, subject: e.target.value})}
                >
                  <option value="">All Subjects</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">File Type</label>
                <div className="flex flex-wrap gap-2">
                  {['pdf', 'docx', 'xlsx', 'zip'].map(type => (
                    <button
                      key={type}
                      onClick={() => setFilters({...filters, type: filters.type === type ? '' : type})}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                        filters.type === type 
                          ? 'bg-blue-100 border-blue-200 text-blue-700' 
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {type.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              {loading ? 'Searching...' : `Found ${files.length} Verified Resources`}
            </h2>
            <select className="text-sm border-gray-300 rounded-lg focus:ring-blue-500">
              <option>Newest First</option>
              <option>Most Downloaded</option>
              <option>Alphabetical</option>
            </select>
          </div>

          {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {[1,2,3,4,5,6].map(i => (
                 <div key={i} className="h-48 bg-gray-200 rounded-xl animate-pulse"></div>
               ))}
             </div>
          ) : files.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No approved papers found</h3>
              <p className="text-gray-500 mt-1">Try adjusting your search terms or filters.</p>
              <button onClick={clearFilters} className="mt-4 text-blue-600 font-medium hover:underline">
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map((file) => (
                <div key={file.id} className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden">
                  <div className="p-4 flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded-lg ${file.file_type === 'pdf' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        <FileText className="w-6 h-6" />
                      </div>
                      {file.visibility === 'public' && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          Public
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
                      {file.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                      {file.description || "No description provided."}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                        <Tag className="w-3 h-3" /> Std {file.standards?.name || '?'}
                      </span>
                      <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                        <Calendar className="w-3 h-3" /> {new Date(file.created_at).getFullYear()}
                      </span>
                    </div>
                  </div>

                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <div className="text-xs text-gray-500 font-medium">
                      {file.size_kb} KB • {file.download_count} DLs
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleDownload(file.file_path)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" 
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDownload(file.file_path)}
                        className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors" 
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
