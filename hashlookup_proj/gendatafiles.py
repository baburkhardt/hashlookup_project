import random
import hashlib
import json
import os
import nltk
from nltk.corpus import words
from tqdm import tqdm  # Optional: progress bar

# Ensure the word list is downloaded
nltk.download('words')

# Load word list
word_list = words.words()

# Select 2,000,000 words (with repetition if needed)
num_words = 2_000_000
if len(word_list) < num_words:
    random_words = random.choices(word_list, k=num_words)
else:
    random_words = random.sample(word_list, num_words)

# Output directory
output_dir = 'word_hashes'
os.makedirs(output_dir, exist_ok=True)

# Batch size and file naming format
batch_size = 10_000

def compute_hashes(word):
    encoded = word.encode('utf-8')
    return {
        'word': word,
        'md5': hashlib.md5(encoded).hexdigest(),
        'sha1': hashlib.sha1(encoded).hexdigest(),
        'sha256': hashlib.sha256(encoded).hexdigest()
    }

# Process words and save in batches
for i in tqdm(range(0, len(random_words), batch_size)):
    batch = random_words[i:i + batch_size]
    hash_data = [compute_hashes(word) for word in batch]

    file_index = i // batch_size + 1  # Start from 1
    filename = os.path.join(output_dir, f'data.{file_index}.json')

    with open(filename, 'w') as f:
        json.dump(hash_data, f, indent=2)

print(f"\nDone! {num_words} words written across {num_words // batch_size} JSON files.")
