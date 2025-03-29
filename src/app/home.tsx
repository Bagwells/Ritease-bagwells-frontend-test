'use client'
import { ChangeEvent, useEffect, useState, DragEvent, useRef, Ref } from "react";
import { FiDownload, FiUpload } from "react-icons/fi";
import { PiSunFill } from "react-icons/pi";
import { toast } from 'react-toastify';
import { WiMoonAltWaningCrescent6 } from "react-icons/wi";
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { PiHighlighterBold } from "react-icons/pi";
import { LuPencilLine } from "react-icons/lu";
import { IoMdCloseCircle } from "react-icons/io";
import { IoColorPaletteSharp } from "react-icons/io5";
import { LiaCommentDots } from "react-icons/lia";
import { MdFormatUnderlined } from "react-icons/md";
import { BiEraser } from "react-icons/bi";
import { jsPDF} from 'jspdf';



interface Annotation {
  width: number;
  height: number;
  type: 'highlight' | 'draw' | 'signature' | 'underline' | 'comment' | 'text' | 'erase';
  x: number;
  y: number;
  color: string;
  page: number;
  path?: string;
  text?: string; 
}

interface UploadedFile {
  url: string ;
  type: 'pdf' | 'image';
}

export default function HomeScreen() {
  const [DarkMode , setDarkMode] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentRef = useRef<HTMLDivElement>(null);
  const [selectedTool, setSelectedTool] = useState<Annotation['type'] | null>(null);
  const [currentColor, setCurrentColor] = useState<string>('#FFFF00');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isDrawing, setIsDrawing] = useState<boolean>(false)
  const [activeAnnotation, setActiveAnnotation] = useState<{
    x: number;
    y: number;
    width: number;
    type: 'text' | 'comment';
  } | null>(null);
  


  const annotationColor = [
    '#FFFF00',
    '#FF6B6B', 
    '#4ECDC4', 
    '#A8DADC', 
    '#FCA311',
  ]

  const handleFileUpload = (e: DragEvent | ChangeEvent<HTMLInputElement>) => {
    const file = 'dataTransfer' in e ? e.dataTransfer.files?.[0] : (e.target as HTMLInputElement).files?.[0];
    if (file) {
      if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setUploadedFile({
              url: reader.result,
              type: file.type === 'application/pdf' ? 'pdf' : 'image',
            });
          }
        };
        reader.readAsDataURL(file);
        toast.success('File upload successful');
      } else {
        toast.error('Unsupported file type. Please upload a PDF or image.');
      }
    }
  };

  const handleDragOver = (e:DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }

  const handleDrop =(e: DragEvent) =>  {
    e.preventDefault();
    e.stopPropagation();
    handleFileUpload(e);

  }

  
  const handleAnnotation = (event: { clientX: number; clientY: number; }) => {
    if (!selectedTool || !documentRef.current) return;

    const rect = documentRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const newAnnotation: Annotation = {
      type: selectedTool,
      x,
      y,
      color: currentColor,
      page: currentPage,
      width: 100, 
      height: 20   
    };

    setAnnotations([...annotations, newAnnotation]);
  };


  const handleMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  
    if ((selectedTool === 'draw' || selectedTool === 'highlight') && documentRef.current) {
      const rect = documentRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
  
      const newAnnotation = {
        type: selectedTool,
        x,
        y,
        color: currentColor,
        page: currentPage,
        ...(selectedTool === 'draw'
          ? { path: `M${x},${y}`, width: 0, height: 0 }
          : { width: 0, height: 20 }),
      };
  
      setAnnotations((prev) => [...prev, newAnnotation]);
      setIsDrawing(true);
    }
  };
  
  const handleMouseMove = (event: React.MouseEvent) => {
    if (isDrawing && annotations.length > 0) {
      const rect = documentRef.current?.getBoundingClientRect();
      if (!rect) return;
  
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
  
      setAnnotations((prev) => {
        const updatedAnnotations = [...prev];
        const lastAnnotation = updatedAnnotations[updatedAnnotations.length - 1];
  
        if (lastAnnotation.type === 'draw') {
          lastAnnotation.path += ` L${x},${y}`;
        } else if (lastAnnotation.type === 'highlight') {
          lastAnnotation.width = x - lastAnnotation.x;
        }
  
        return updatedAnnotations;
      });
    }
  };
  
  const handleMouseUp = () => {
    if (selectedTool === 'draw' || selectedTool === 'signature' || selectedTool === 'highlight') {
      setIsDrawing(false);
    }
  };
  
  const handleComment = (event: React.MouseEvent) => {
    if (selectedTool === 'comment' && documentRef.current) {
      const rect = documentRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setActiveAnnotation({ x, y, type: 'comment', width: 200 });
    }
  };

  const handleUnderline = (event: React.MouseEvent) => {
    if (selectedTool === 'underline' && documentRef.current) {
      const rect = documentRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
  
      const underlineWidth = 100; 
      setAnnotations((prev) => [
        ...prev,
        { type: 'underline', x, y, color: currentColor, page: currentPage, width: underlineWidth, height: 2 },
      ]);
    }
  };

  const handleErase = (event: React.MouseEvent) => {
    if (selectedTool === 'erase' && documentRef.current) {
      const rect = documentRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
  
      setAnnotations((prev) =>
        prev.filter((annotation) => {
          if (annotation.type === 'draw' || annotation.type === 'signature') {

            return !annotation.path?.includes(`M${x},${y}`);
          } else {
            return !(
              x >= annotation.x &&
              x <= annotation.x + (annotation.width || 0) &&
              y >= annotation.y &&
              y <= annotation.y + (annotation.height || 0)
            );
          }
        })
      );
    }
  };



  const exportAnnotatedDocument = () => {
    if (!uploadedFile || !documentRef.current) {
      toast?.error("No document to export!");
      return;
    }
      if (uploadedFile.type === "image") {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
    
        if (!context) {
          toast?.error("Failed to create canvas context!");
          return;
        }
        const rect = documentRef.current.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        const image = new Image();
        image.src = uploadedFile.url;
        image.onload = () => {
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          annotations.forEach((annotation) => {
            if (annotation.page !== currentPage) return;
            if (annotation.type === "draw" || annotation.type === "signature") {
              context.strokeStyle = annotation.color;
              context.lineWidth = 2;
              context.beginPath();
              const path = new Path2D(annotation.path || "");
              context.stroke(path);
            } else if (annotation.type === "underline") {
              context.fillStyle = annotation.color;
              context.fillRect(
                annotation.x,
                annotation.y,
                annotation.width,
                annotation.height
              );
            } else if (annotation.type === "comment" || annotation.type === "text") {
              context.fillStyle = annotation.color;
              context.font = "14px Arial";
              context.fillText(
                annotation.text || "",
                annotation.x,
                annotation.y + 14
              );
            }
          });
          const link = document.createElement("a");
          link.download = "annotated-image.png";
          link.href = canvas.toDataURL("image/png");
          link.click();
        };
      } else if (uploadedFile.type === "pdf") {
        const pdf = new jsPDF();
        const image = new Image();
        image.src = uploadedFile.url;
        image.onload = () => {
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          pdf.addImage(image, "PNG", 0, 0, pageWidth, pageHeight);
          annotations.forEach((annotation) => {
            if (annotation.page !== currentPage) return;
            if (annotation.type === "draw" || annotation.type === "signature") {
              pdf.setDrawColor(annotation.color);
              pdf.setLineWidth(2);
              const path = new Path2D(annotation.path || "");
            } else if (annotation.type === "underline") {
              pdf.setFillColor(annotation.color);
              pdf.rect(
                annotation.x,
                annotation.y,
                annotation.width,
                annotation.height,
                "F"
              );
            } else if (annotation.type === "comment") {
              pdf.setTextColor(annotation.color);
              pdf.setFontSize(14);
              pdf.text(annotation.text || "", annotation.x, annotation.y + 14);
            }
          });
          pdf.save("annotated-document.pdf");
        pdf.save("annotated-document.pdf");
      };
    }
  };





  const background = DarkMode ? 'text-neutral-100 bg-[#212121]' : 'text-neutral-900 bg-gray-100'
  const text = DarkMode ? 'text-neutral-100 ' : 'text-neutral-900'

  useEffect(()=> {
    document.documentElement?.classList?.toggle('dark', DarkMode);
  }, [DarkMode])

  return (
    <div className={`flex flex-col w-screen h-[100svh] md:h-screen transition-colors duration-300 ease-in-out ${background}`}>
      <div className="flex flex-col flex-1 p-4 md:p-8 ">
        <div className="flex justify-between items-center ">
          <h1 className="font-bold text-base sm:text-xl md:text-2xl !text-green-500">
            Ritese Document Annotator
          </h1>
          <div className="flex items-center rounded-lg px-4 py-2 gap-4">
            <div onClick={exportAnnotatedDocument}
              className={`${text} text-3xl hover:scale-105 transition-transform duration-300 ease-in-out `}>
              <FiDownload />
            </div>
            <div onClick={()=> setDarkMode(prevState => !prevState)}
              className={`${text} text-3xl hover:scale-105 transition-transform duration-300 ease-in-out`}>
              {
                DarkMode ? <PiSunFill />  : <WiMoonAltWaningCrescent6 />
              }
            </div>
          </div>
        </div>
        <div className="flex flex-col flex-1 items-center  py-10 relative">
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`${DarkMode ? 'bg-[#000000]/20 border-2' : 'bg-white border'} mt-10 w-full h-[280px] lg:w-[650px] flex flex-col items-center border-gray-300 rounded-lg p-5 pt-7 lg:pt-12 lg:p-10 shadow-md`}>
            <div className="flex flex-col size-full border-[1.5px] border-dashed border-gray-300 rounded-md items-center justify-center hover:opacity-80 hover:scale-95 transition-all duration-300 ease-in-out">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.jpg,.png"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="mb-4 gap-2 font-bold text-base border border-gray-300 rounded-2xl flex items-center p-2 px-4 hover:opacity-80"
              >
                <FiUpload /> <span>Upload Documents</span>
              </button>

              <div className={`text-sm lg:text-base`}>
                or drag and drop documents here
              </div>
            </div>
          </div>

          <div 
            onClick={selectedTool == 'comment' ? handleComment : undefined}
            className={`${ uploadedFile == null ? 'hidden' : 'flex flex-col' } lg:top-2 w-full h-full absolute inset-0 transition-all duration-300 ease-in ${background} z-10`}
          >
            {uploadedFile && (
                <div className="mt-6 flex space-x-4 mb-4 justify-between">
                  <div className="flex gap-2 flex-wrap">
                      {/* Highlight Tool */}
                    <button
                      onClick={() => setSelectedTool('highlight')}
                      className={`flex items-center text-xs px-3 py-2 rounded-md transition-colors ${
                        selectedTool === 'highlight'
                          ? 'bg-blue-500 text-white'
                          : `hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-300`
                      }`}
                    >
                      <PiHighlighterBold className="mr-2" /> Highlight
                    </button>
                    
                    <button
                      onClick={() => setSelectedTool('draw')}
                      className={`flex items-center text-xs px-3 py-2 rounded-md transition-colors ${
                        selectedTool === 'draw'
                          ? 'bg-blue-500 text-white'
                          : `hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-300`
                      }`}
                    >
                      <LuPencilLine className="mr-2" /> Draw
                    </button>

                    <button
                      onClick={() => setSelectedTool('underline')}
                      className={`flex items-center text-xs px-3 py-2 rounded-md transition-colors ${
                        selectedTool === 'underline'
                          ? 'bg-blue-500 text-white'
                          : `hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-300`
                      }`}
                    >
                      <MdFormatUnderlined className='mr-2'/> Underline
                    </button>

                    <button
                      onClick={() => setSelectedTool('comment')}
                      className={`flex items-center text-xs px-3 py-2 rounded-md transition-colors ${
                        selectedTool === 'comment'
                          ? 'bg-blue-500 text-white'
                          : `hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-300`
                      }`}
                    >
                      <LiaCommentDots className="mr-2" /> Comment
                    </button>
                    <button
                      onClick={() => setSelectedTool('erase')}
                      className={`flex items-center text-xs px-3 py-2 rounded-md transition-colors ${
                        selectedTool === 'erase'
                          ? 'bg-blue-500 text-white'
                          : `hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-300`
                      }`}
                    >
                      <BiEraser className="mr-2" /> Erase
                    </button>

                    

                    {/* Color Picker */}
                    <Menu as="div" className="relative inline-block text-left">
                      <MenuButton 
                        className="flex items-center text-xs px-3 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                      >
                        <IoColorPaletteSharp className="mr-2" /> Color
                      </MenuButton>
                      <Transition
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <MenuItems className={`absolute z-10 mt-2 w-40 origin-top-right rounded-md ${background} shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none`}>
                          <div className="p-2 flex flex-wrap gap-2">
                            {annotationColor.map(color => (
                              <MenuItem key={color}>
                                {({ active }: { active: boolean }) => (
                                  <div 
                                    onClick={() => setCurrentColor(color)}
                                    className="w-8 h-8 rounded-full cursor-pointer hover:scale-110 transition-transform"
                                    style={{ backgroundColor: color }}
                                  />
                                )}
                              </MenuItem>
                            ))}
                          </div>
                        </MenuItems>
                      </Transition>
                    </Menu>
                  </div>

                  <button
                    onClick={() => setUploadedFile(null)}
                    className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors z-10"
                  >
                    <IoMdCloseCircle/>
                  </button>

                  

                  {/* Page Navigation for PDFs */}
                  {uploadedFile.type === 'pdf' && (
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage <= 1}
                        className={`px-3 py-2 rounded-md ${
                          currentPage <= 1 
                            ? 'text-gray-400 cursor-not-allowed' 
                            : `hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-300`
                        }`}
                      >
                        Previous
                      </button>
                      <span>Page {currentPage}</span>
                      <button 
                        onClick={() => setCurrentPage(currentPage + 1)}
                        className="px-3 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}

            {/* Document Viewer with Annotations */}
            {uploadedFile && (
              <div
                ref={documentRef}
                onMouseDown={(event) => {
                  if (selectedTool === 'erase') handleErase(event);
                  if (selectedTool === 'underline') handleUnderline(event);
                  if (selectedTool === 'comment') handleComment(event);
                  if (selectedTool === 'draw' || selectedTool === 'highlight') handleMouseDown(event);
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="relative w-full h-[600px] overflow-auto border rounded-lg"
              >
                {uploadedFile.type === 'pdf' ? (
                  <iframe
                    src={uploadedFile.url}
                    width="100%"
                    height="100%"
                    title="PDF Document"
                  />
                ) : (
                  <img 
                    src={uploadedFile.url} 
                    alt="Uploaded Document" 
                    className="w-full h-full object-contain"
                  />
                )}

                {activeAnnotation && (
                    <div
                      style={{
                        position: 'absolute',
                        left: activeAnnotation.x,
                        top: activeAnnotation.y,
                        zIndex: 10,
                      }}
                    >
                      <textarea
                        autoFocus
                        onBlur={(e) => {
                          const commentText = e.target.value.trim();
                          if (commentText && activeAnnotation) {
                            setAnnotations((prev) => [
                              ...prev,
                              {
                                type: 'comment',
                                x: activeAnnotation.x,
                                y: activeAnnotation.y,
                                color: currentColor,
                                page: currentPage,
                                text: commentText,
                                width: activeAnnotation.width,
                                height: 20,
                              },
                            ]);
                          }
                          setActiveAnnotation(null); // Clearing activeAnnotation here
                        }}
                        className="border border-gray-300 rounded px-2 py-1 text-sm text-blue-400 placeholder:text-blue-400"
                        placeholder="Enter comment"
                      />                
                  </div>
                )}

                {/* Render Annotations */}
                {annotations
                  .filter((annotation) => annotation.page === currentPage)
                  .map((annotation, index) => {
                    switch (annotation.type) {
                      case 'draw':
                        return (
                          <svg
                            key={index}
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              pointerEvents: 'none',
                            }}
                            width="100%"
                            height="100%"
                          >
                            <path
                              d={annotation.path}
                              stroke={annotation.color}
                              strokeWidth={2}
                              fill="none"
                            />
                          </svg>
                        );
                      case 'highlight':
                        return (
                          <div
                            key={index}
                            style={{
                              position: 'absolute',
                              left: annotation.x,
                              top: annotation.y,
                              width: annotation.width,
                              height: annotation.height,
                              backgroundColor: annotation.color,
                              opacity: 0.4,
                            }}
                          />
                        );
                      case 'underline':
                        return (
                          <div
                            key={index}
                            style={{
                              position: 'absolute',
                              left: annotation.x,
                              top: annotation.y,
                              width: annotation.width,
                              height: '2px',
                              backgroundColor: annotation.color,
                            }}
                          />
                        );
                      default:
                        return null;
                    }
                  })}
              </div>
            )}

          </div>
        </div>
      </div>
      <footer className="w-full px-8 pb-2">
        <p className={` font-semibold text-base text-center text-green-600`}>
            Ritease ({new Date().getFullYear()})
        </p>
      </footer>
    </div>
  );
}