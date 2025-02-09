"use client"

import { Chapter, Part, Subpart, Section } from '@prisma/client'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import Link from 'next/link'

type ChapterWithRelations = Chapter & {
  parts: (Part & {
    subparts: (Subpart & {
      sections: Section[]
    })[]
  })[]
}

interface StructureTreeProps {
  chapters: ChapterWithRelations[]
}

export function StructureTree({ chapters }: StructureTreeProps) {
  return (
    <Accordion type="multiple" className="w-full">
      {chapters.map(chapter => (
        <AccordionItem key={chapter.id} value={`chapter-${chapter.id}`}>
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <div className="font-medium">Chapter {chapter.number}</div>
              <div className="text-sm text-gray-500">{chapter.name}</div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="pl-4 space-y-2">
              {chapter.parts.map(part => (
                <Accordion key={part.id} type="multiple" className="w-full">
                  <AccordionItem value={`part-${part.id}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">Part {part.number}</div>
                        <div className="text-sm text-gray-500">{part.name}</div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-4 space-y-2">
                        {part.subparts.map(subpart => (
                          <Accordion key={subpart.id} type="multiple" className="w-full">
                            <AccordionItem value={`subpart-${subpart.id}`}>
                              <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-2">
                                  <div className="font-medium">Subpart</div>
                                  <div className="text-sm text-gray-500">{subpart.name}</div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="pl-4 space-y-2">
                                  {subpart.sections.map(section => (
                                    <Link
                                      key={section.id}
                                      href={`/titles/${chapter.titleId}/sections/${section.number}`}
                                      className="block py-2 px-4 rounded-md hover:bg-gray-100"
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className="font-medium">§ {section.number}</div>
                                        <div className="text-sm text-gray-500">{section.name}</div>
                                      </div>
                                    </Link>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}